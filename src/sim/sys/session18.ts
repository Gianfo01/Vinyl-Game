// Rodada 18 (talent18, K2) — BANDA DA CASA própria (Funk Brothers, Wrecking Crew, Swampers, MFSB): estende os
// músicos de estúdio do agenda17 (aluguel por 6 meses) para um elenco fixo do selo. Salário mensal (piso sindical
// se o selo assinou o acordo do w4), som de assinatura que amadurece com as sessões e vale para TODO o elenco do
// gênero, e a escolha que a história cobrou: dar crédito na capa (mais caro, lealdade) ou omitir (barato, ressentimento
// que vira revolta: greve de sessão, processo público ou o melhor músico indo para um rival). Dá para alugar a banda
// a outros selos nos meses livres e um músico pode virar estrela solo.

import { clamp, Rng } from '../../core/rng';
import { FAMILIES, cityById, l, type FamilyId, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { bumpPerks, registerPerkSource, type PerkEntry } from '../perks';
import { langForCity, personName } from '../people';
import type { GameState } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { familyOf } from '../../data/world';
import { w4 } from './world4/state';

export interface HB18 { name: string; fam: FamilyId; q: number; since: number; credit: boolean; res: number; sess: number; rent: boolean; strike: number; ace: string; players: string[]; hits: number }
export interface Sess18State { hb?: HB18; log: { w: number; t: L }[] }
declare module '../ext4' { interface Ext4 { sess18: Sess18State } }
registerExt4('sess18', () => ({ log: [] }));
export function sess18(s: GameState): Sess18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.sess18 ??= { log: [] }) as Sess18State;
  st.log ??= [];
  return st;
}
const log = (s: GameState, t: L) => { const st = sess18(s); st.log.push({ w: s.week, t }); if (st.log.length > 20) st.log.shift(); };

export const hbSetup18 = (s: GameState) => money(s, 15000);
/** Salário mensal: piso sindical (acordo do w4) custa mais; crédito na capa +20%. */
export function hbSalary18(s: GameState, hb?: HB18): number {
  const base = 3200 + (hb?.q ?? 0.55) * 4000;
  const union = s.year >= 1944 && w4(s).union ? 1.25 : 1;
  return money(s, base * union * (hb?.credit ? 1.2 : 1));
}
export const hbMaxQ18 = (hb: HB18) => clamp(0.6 + hb.sess * 0.006 + (hb.credit ? 0.08 : 0), 0.55, 0.95);
/** Bônus de faixa por ato (puro): gênero da casa inteiro, fora dele metade; em greve, nada; alugada, metade. */
export function hbBonus18(s: GameState, actId: string): number {
  const hb = sess18(s).hb, a = s.acts[actId];
  if (!hb || !a || hb.strike > s.week) return 0;
  return (0.4 + 1.6 * hb.q) * (familyOf(a.genre) === hb.fam ? 1 : 0.5) * (hb.rent ? 0.5 : 1);
}

export function foundHB18(s: GameState, fam: FamilyId, credit: boolean): L | null {
  const st = sess18(s);
  if (st.hb) return l('Você já tem uma banda da casa.', 'You already have a house band.');
  if (s.year < 1925) return l('Ainda não há estúdios para isso.', 'No studios for that yet.');
  const c = hbSetup18(s);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, 'venture:hb18', -c, 'capex', 'Banda da casa: sala e instrumentos');
  const r = Rng.fromSeed(`${s.config.seed}|hb18|${s.week}`);
  const lang = langForCity(s.config.homeCity, r);
  const players = Array.from({ length: 5 }, () => personName(r, lang));
  const city = cityById[s.config.homeCity]?.name.pt ?? '';
  const nick = r.pick(['Os Porões', 'The Basement Cats', 'Turma da Sala B', 'The Snakepit Five', 'Os Swampers do Sul', 'The Night Shift']);
  st.hb = { name: `${nick}${city ? ` (${city})` : ''}`, fam, q: 0.55, since: s.year, credit, res: 0, sess: 0, rent: false, strike: 0, ace: players[0], players, hits: 0 };
  bumpPerks();
  log(s, fmtL(l('Banda da casa fundada: {n}. Crédito na capa: {c}.', 'House band founded: {n}. Sleeve credit: {c}.'), { n: st.hb.name, c: credit ? l('sim', 'yes') : l('não', 'no') }));
  emitFact(s, { kind: 'hire', actors: ['player'], severity: 18, visibility: 'public', tags: ['good', 'session', 'house_band'], src: 'session18', text: fmtL(l('{c} monta uma banda da casa: {n}.', '{c} puts together a house band: {n}.'), { c: s.config.companyName, n: st.hb.name }) });
  return null;
}
export function setCredit18(s: GameState, on: boolean): L | null {
  const hb = sess18(s).hb;
  if (!hb) return l('Sem banda da casa.', 'No house band.');
  hb.credit = on;
  if (on) { hb.res = Math.max(0, hb.res - 30); log(s, l('A banda passa a sair nos créditos da capa.', 'The band now gets sleeve credits.')); }
  return null;
}
export function setRent18(s: GameState, on: boolean): L | null { const hb = sess18(s).hb; if (!hb) return l('Sem banda da casa.', 'No house band.'); hb.rent = on; bumpPerks(); return null; }
export function disbandHB18(s: GameState): L | null {
  const st = sess18(s);
  if (!st.hb) return l('Sem banda da casa.', 'No house band.');
  log(s, fmtL(l('{n} é dissolvida depois de {y} anos.', '{n} disbands after {y} years.'), { n: st.hb.name, y: s.year - st.hb.since }));
  emitFact(s, { kind: 'exit', actors: ['player'], severity: 15 + st.hb.hits * 3, visibility: 'public', tags: ['session', 'house_band'], src: 'session18', text: fmtL(l('Fim de uma era: {c} dissolve {n}.', 'End of an era: {c} disbands {n}.'), { c: s.config.companyName, n: st.hb.name }) });
  st.hb = undefined;
  bumpPerks();
  return null;
}

registerPerkSource('session18', (s) => {
  const hb = sess18(s).hb;
  if (!hb || hb.strike > s.week) return [];
  const out: PerkEntry[] = [{ label: fmtL(l('Banda da casa: {n}', 'House band: {n}'), { n: hb.name }), values: { songQ: 0.4 + 1.6 * hb.q }, act: (s2, a) => a.owner === 'player' && hbBonus18(s2, a.id) > 0 }];
  if (hb.sess >= 24 && hb.q >= 0.75) out.push({ label: fmtL(l('Som de assinatura ({n})', 'Signature sound ({n})'), { n: hb.name }), values: { appeal: 0.015 }, act: (_s, a) => a.owner === 'player' && familyOf(a.genre) === hb.fam });
  return out;
});

registerInboxKind('sess18_revolt', { label: l('Banda da casa', 'House band'), cat: 'staff', icon: 'guitar', prio: 3, goto: () => ({ area: 'talent18', tab: ['talent18', 'band'] }),
  handle: (s, m, act) => {
    const hb = sess18(s).hb;
    if (!hb) return l('A banda já não existe.', 'The band no longer exists.');
    if (act === 'credit') { hb.credit = true; hb.res = 0; post(s, 'hb18pts', -money(s, 6000), 'royalties', 'Banda da casa: pontos retroativos'); return l('Crédito e pontos retroativos: a banda volta feliz e mais leal.', 'Credit and back points: the band comes back happy and more loyal.'); }
    if (act === 'buy') { hb.res = Math.max(0, hb.res - 35); post(s, 'hb18bonus', -money(s, 9000), 'salaries', 'Banda da casa: bônus'); return l('Um bônus gordo calou a revolta — por enquanto.', 'A fat bonus quieted the revolt — for now.'); }
    hb.strike = s.week + 13; hb.res = Math.max(0, hb.res - 15);
    bumpPerks();
    emitFact(s, { kind: 'boycott', actors: ['player'], severity: 40, visibility: 'public', tags: ['bad', 'session', 'credit', 'strike'], src: 'session18', text: fmtL(l('{n} entra em greve de sessão contra {c}: "tocamos em todos os sucessos e nosso nome nunca apareceu".', '{n} goes on a session strike against {c}: "we played on every hit and our name never appeared".'), { n: hb.name, c: s.config.companyName }) });
    s.player.reputation.artists = clamp(s.player.reputation.artists - 3, 0, 100);
    return l('Greve: 3 meses sem a banda nas gravações e a história nos jornais.', 'Strike: 3 months without the band in sessions and the story in the papers.');
  } });
registerInboxKind('sess18_poach', { label: l('Banda da casa', 'House band'), cat: 'staff', icon: 'guitar', prio: 2,
  handle: (s, m, act) => {
    const hb = sess18(s).hb;
    if (!hb) return l('A banda já não existe.', 'The band no longer exists.');
    if (act === 'raise') { post(s, 'hb18raise', -money(s, 5000), 'salaries', `Banda da casa: aumento ${hb.ace}`); hb.res = Math.max(0, hb.res - 10); return fmtL(l('{p} fica, com aumento.', '{p} stays, with a raise.'), { p: hb.ace }); }
    const lb = String(m.ref?.lb ?? '');
    hb.q = clamp(hb.q - 0.1, 0.4, 0.95);
    const old = hb.ace;
    hb.players = hb.players.filter((x) => x !== old);
    const r = Rng.fromSeed(`${s.config.seed}|hbnew|${s.week}`);
    hb.players.push(personName(r, langForCity(s.config.homeCity, r)));
    hb.ace = hb.players[0];
    emitFact(s, { kind: 'poach', actors: ['player'], severity: 20, visibility: 'public', tags: ['session', 'house_band'], src: 'session18', text: fmtL(l('{p}, da banda da casa de {c}, vai para {l}.', '{p}, from {c}\'s house band, leaves for {l}.'), { p: old, c: s.config.companyName, l: s.labels[lb]?.name ?? '?' }) });
    return fmtL(l('{p} se foi. Qualidade da banda −0,1 até o substituto pegar o jeito.', '{p} is gone. Band quality −0.1 until the replacement settles in.'), { p: old });
  } });

registerSimHook('month', 'session18', (s) => {
  const hb = sess18(s).hb;
  if (!hb) return;
  const sal = hbSalary18(s, hb);
  post(s, 'hb18sal', -sal, 'salaries', `Banda da casa: ${hb.name}`);
  if (hb.rent && hb.strike <= s.week) post(s, 'hb18rent', Math.round(sal * 0.6 + money(s, 1500 * hb.q)), 'services', `Banda da casa alugada`);
  const busy = playerActs(s).some((id) => (s.acts[id]?.songs ?? []).some((sid) => s.songs[sid]?.recorded && (s.songs[sid]?.createdWeek ?? 0) > s.week - 5));
  if (busy && hb.strike <= s.week) { hb.sess++; hb.q = clamp(hb.q + 0.01, 0.4, hbMaxQ18(hb)); }
  // ressentimento: sem crédito, cada hit do selo pesa; sem acordo sindical, o salário também
  const hitsNow = playerActs(s).reduce((t, id) => t + (s.acts[id]?.hits ?? 0), 0);
  const newHits = Math.max(0, hitsNow - hb.hits);
  hb.hits = hitsNow;
  if (!hb.credit) hb.res = clamp(hb.res + 1 + newHits * 6 + (s.year >= 1944 && !w4(s).union ? 0.5 : 0), 0, 100);
  else hb.res = clamp(hb.res - 1, 0, 100);
  const r = Rng.fromSeed(`${s.config.seed}|hb18m|${s.week}`);
  if (hb.res >= 60 && hb.strike <= s.week && r.chance(0.35)) {
    hb.res = 45;
    pushInbox18(s, 'sess18_revolt', { from: hb.ace, subject: fmtL(l('{n}: "queremos nosso nome nos discos"', '{n}: "we want our name on the records"'), { n: hb.name }),
      body: fmtL(l('A banda tocou em {h} hits do selo sem crédito. Pedem crédito na capa e pontos retroativos; ou um bônus. Recusar = greve e jornal.', 'The band played on {h} of the label\'s hits uncredited. They ask for sleeve credit and back points; or a bonus. Refusing = strike and headlines.'), { h: hitsNow }),
      actions: [{ id: 'credit', label: l('Dar crédito e pontos', 'Give credit and points') }, { id: 'buy', label: l('Pagar um bônus', 'Pay a bonus') }, { id: 'refuse', label: l('Recusar', 'Refuse') }], tone: 'bad' });
  }
  // o melhor músico é cobiçado
  if (hb.q >= 0.75 && r.chance(0.025 + hb.res / 2000)) {
    const lbs = Object.values(s.labels).filter((x) => x.active);
    if (lbs.length) {
      const lb = r.pick(lbs);
      pushInbox18(s, 'sess18_poach', { from: lb.name, subject: fmtL(l('{l} quer {p}, da sua banda da casa', '{l} wants {p}, from your house band'), { l: lb.name, p: hb.ace }),
        body: l('Proposta melhor e crédito garantido. Cobrir (aumento) ou deixar ir (qualidade cai).', 'A better offer and guaranteed credit. Match it (raise) or let go (quality drops).'), ref: { lb: lb.id },
        actions: [{ id: 'raise', label: l('Dar aumento', 'Give a raise') }, { id: 'go', label: l('Deixar ir', 'Let go') }] });
    }
  }
});

registerExplain('sess18.bonus', (s, c) => {
  const hb = sess18(s).hb, a = s.acts[String(c.act)];
  if (!hb) return null;
  const parts = [{ label: l('Qualidade da banda', 'Band quality'), value: hb.q, fmt: 'num' as const }, { label: l('Sessões tocadas', 'Sessions played'), value: hb.sess, fmt: 'num' as const }];
  if (a) parts.push({ label: familyOf(a.genre) === hb.fam ? l('Gênero da casa', 'House genre') : l('Fora do gênero (metade)', 'Off-genre (half)'), value: familyOf(a.genre) === hb.fam ? 1 : 0.5, fmt: 'num' as const });
  return { title: l('Bônus de faixa da banda da casa', 'House band track bonus'), value: a ? hbBonus18(s, a.id) : 0.4 + 1.6 * hb.q, fmt: 'num', parts, note: l('+0,4 a +2 de qualidade por faixa; teto sobe com sessões e crédito; greve zera, aluguel corta pela metade.', '+0.4 to +2 quality per track; the cap rises with sessions and credit; strike zeroes it, renting halves it.') };
});
registerAdvisorTip('session18', (s) => {
  const hb = sess18(s).hb;
  if (!hb || hb.credit || hb.res < 40) return [];
  return [{ id: 'hb18-res', level: 'warn', cat: 'people', score: 55, text: fmtL(l('{n} está ressentida ({r}/100).', '{n} is resentful ({r}/100).'), { n: hb.name, r: Math.round(hb.res) }), why: [l('Tocam nos hits sem crédito.', 'They play on the hits uncredited.')], effect: l('Dar crédito: +20% de salário, fim da revolta.', 'Give credit: +20% salary, end of the revolt.'), run: { label: l('Dar crédito', 'Give credit'), fn: (s2) => setCredit18(s2, true) ?? l('Feito.', 'Done.') } }];
});
export const HB_FAMS18 = (s: GameState) => FAMILIES.filter((f) => !['sacred'].includes(f.id) || s.year > 1930);
