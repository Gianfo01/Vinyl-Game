// Rodada 17 (F) — Direitos de voz e imagem (direito de personalidade), com o artista ou com o espólio. Escopos
// por época: merch, publicidade, cinebiografia, videogame, holograma (2012+), voz por IA (2023+). Chance de
// aceitar é INVERSA à fama: iniciante, sem contrato ou sem dinheiro aceita fácil; estrela negocia duro;
// empresário protege; espólio quer dinheiro mas veta voz sintética. Proteções contra abuso: fatia mínima de 5%,
// prazo máximo de 10 anos para vivos (perpétuo só com espólio), no máximo 2 acordos "predatórios" por ano
// (abaixo de 60% da fatia justa). Acordo predatório cobra depois: se o artista cresce, exige renegociação;
// sem acordo, processa (chance pelo Jurídico) e vira escândalo de dinheiro. Receita mensal por escopo; parte
// vai ao artista/espólio. Gerador próprio por mês e por pedido.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { grantHold } from '../holds17';
import { scandal } from '../scandal17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, post } from '../util';

export type Scope = 'merch' | 'ads' | 'biopic' | 'game' | 'hologram' | 'voice_ai';
export const SCOPES: Record<Scope, { name: L; desc: L; from: number; weight: number }> = {
  merch: { name: l('Merch', 'Merch'), desc: l('Rosto e nome em produtos (libera a linha de merch sem contrato 360).', 'Face and name on products (unlocks merch without a 360 deal).'), from: 1950, weight: 0.03 },
  ads: { name: l('Publicidade', 'Advertising'), desc: l('Campanhas com o rosto do artista: renda mensal se ele for conhecido.', 'Campaigns with the artist\'s face: monthly income if they are known.'), from: 1950, weight: 0.05 },
  biopic: { name: l('Cinebiografia', 'Biopic'), desc: l('Direito de contar a vida no cinema: um pagamento grande e o catálogo volta às paradas.', 'Right to tell the life story on film: one big payment and the catalog returns to the charts.'), from: 1970, weight: 0.06 },
  game: { name: l('Videogame', 'Video game'), desc: l('Personagem jogável e músicas no jogo.', 'Playable character and songs in the game.'), from: 1995, weight: 0.04 },
  hologram: { name: l('Holograma', 'Hologram'), desc: l('Turnê de holograma (só espólio): dinheiro e polêmica.', 'Hologram tour (estates only): money and controversy.'), from: 2012, weight: 0.08 },
  voice_ai: { name: l('Voz por IA', 'AI voice'), desc: l('Modelo de voz licenciado: renda contínua, rejeição alta.', 'Licensed voice model: steady income, high resistance.'), from: 2023, weight: 0.1 },
};
export interface ImgDeal { adsOff?: number; id: string; act: string; estate: boolean; scopes: Scope[]; share: number; fair: number; until: number; fame0: number; upfront: number; earned: number; done: Scope[]; holo?: number; status: 'active' | 'demand' | 'ended'; demandW?: number; pred: boolean; y: number }
export interface Img17 { deals: ImgDeal[]; asked: Record<string, number>; pred: Record<number, number>; log: { y: number; t: L }[] }
declare module '../ext4' { interface Ext4 { img17: Img17 } }
registerExt4('img17', () => ({ deals: [], asked: {}, pred: {}, log: [] }));
export const img17 = (s: GameState): Img17 => { const x = s.x4 as unknown as { img17?: Img17 }; return (x.img17 ??= { deals: [], asked: {}, pred: {}, log: [] }); };
const log = (s: GameState, t: L) => { const st = img17(s); st.log.unshift({ y: s.year, t }); if (st.log.length > 30) st.log.pop(); };

export const isEstate = (s: GameState, a: Act): boolean => !!a.deceased || (a.members.length > 0 && a.members.every((id) => s.persons[id] && !s.persons[id].alive));
export const scopesNow = (s: GameState, a: Act): Scope[] => (Object.keys(SCOPES) as Scope[]).filter((k) => s.year >= SCOPES[k].from && (k !== 'hologram' || isEstate(s, a)));
export const activeDeal = (s: GameState, actId: string): ImgDeal | undefined => img17(s).deals.find((d) => d.act === actId && d.status !== 'ended' && d.until >= s.year);
export const hasRight = (s: GameState, actId: string, sc: Scope): boolean => !!activeDeal(s, actId)?.scopes.includes(sc);
export const fairShare = (a: Act, scopes: Scope[]): number => clamp(0.12 + a.fame / 300 + scopes.reduce((t, k) => t + SCOPES[k].weight, 0), 0.1, 0.6);
export const MIN_SHARE = 0.05;
export const PRED_CAP = 2;

export interface Terms { scopes: Scope[]; share: number; years: number; upfront: number }
/** Chance de aceitar e o porquê (a mesma conta do pedido). */
export function imgChance(s: GameState, a: Act, t: Terms): { p: number; why: [L, number][]; block?: L } {
  const est = isEstate(s, a);
  if (!t.scopes.length) return { p: 0, why: [], block: l('Escolha ao menos um escopo.', 'Pick at least one scope.') };
  if (t.share < MIN_SHARE) return { p: 0, why: [], block: l('Fatia mínima do artista: 5%.', 'Minimum artist share: 5%.') };
  if (!est && (t.years <= 0 || t.years > 10)) return { p: 0, why: [], block: l('Com artista vivo, prazo de 1 a 10 anos (perpétuo só com espólio).', 'With a living artist, 1 to 10 years (perpetual only with an estate).') };
  const fair = fairShare(a, t.scopes);
  if (t.share < fair * 0.6 && (img17(s).pred[s.year] ?? 0) >= PRED_CAP) return { p: 0, why: [], block: l('Você já fez dois acordos predatórios este ano: advogados e imprensa estão de olho.', 'You already made two predatory deals this year: lawyers and press are watching.') };
  const why: [L, number][] = [];
  const add = (w: L, v: number) => { if (Math.abs(v) >= 0.005) why.push([w, v]); };
  add(l('Base', 'Base'), 0.3);
  add(est ? l('Espólio: quer renda, pensa no legado', 'Estate: wants income, guards the legacy') : fmtL(l('Fama {f}: quanto mais famoso, mais duro', 'Fame {f}: the more famous, the tougher'), { f: Math.round(a.fame) }), est ? 0.05 : (50 - a.fame) / 110);
  if (!est && a.status === 'emerging') add(l('Início de carreira: quer a chance', 'Early career: wants the break'), 0.1);
  if (!est && (a.cash < 0 || !a.owner)) add(l('Sem contrato/sem dinheiro: aceita mais fácil', 'No deal/no money: accepts more easily'), 0.12);
  add(l('Confiança em você', 'Trust in you'), a.owner === 'player' ? (a.trust - 50) / 250 : -0.05);
  add(fmtL(l('Fatia {p}% (justa ≈ {f}%)', 'Share {p}% (fair ≈ {f}%)'), { p: Math.round(t.share * 100), f: Math.round(fair * 100) }), (t.share - fair) * 1.5);
  const ref = money(s, 2000 + a.fame * a.fame * 30);
  add(l('Luvas (pagamento na assinatura)', 'Signing payment'), Math.min(0.2, (t.upfront / ref) * 0.1));
  add(l('Escopos pedidos', 'Scopes requested'), -0.05 * Math.max(0, t.scopes.length - 1));
  if (t.scopes.includes('voice_ai')) add(l('Voz sintética: muita resistência', 'Synthetic voice: strong resistance'), est ? -0.08 : -0.18);
  if (t.years <= 0) add(l('Perpétuo', 'Perpetual'), -0.15);
  else add(fmtL(l('Prazo de {y} anos', '{y}-year term'), { y: t.years }), -(t.years - 3) * 0.015);
  const m14 = (s.x4 as unknown as { m14?: { rep: Record<string, { m: string }> } }).m14;
  if (!est && m14?.rep[a.id]) add(l('Empresário protege a imagem do cliente', 'Manager protects the client\'s image'), -0.1);
  const p = clamp(why.reduce((t2, x) => t2 + x[1], 0), 0.02, 0.95);
  return { p, why };
}

export function askImage(s: GameState, actId: string, t: Terms): { ok: boolean; text: L } {
  const a = s.acts[actId];
  if (!a) return { ok: false, text: l('Inválido.', 'Invalid.') };
  const st = img17(s);
  if (activeDeal(s, actId)) return { ok: false, text: l('Já existe acordo de imagem em vigor.', 'An image deal is already in force.') };
  if ((st.asked[actId] ?? -99) > s.week - 26) return { ok: false, text: l('Você pediu há pouco: espere seis meses.', 'You asked recently: wait six months.') };
  const c = imgChance(s, a, t);
  if (c.block) return { ok: false, text: c.block };
  if (s.player.cash < t.upfront) return { ok: false, text: l('Caixa insuficiente para as luvas.', 'Not enough cash for the signing payment.') };
  st.asked[actId] = s.week;
  const est = isEstate(s, a);
  const r = Rng.fromSeed(`${s.config.seed}:img17:${actId}:${s.week}`);
  const who = est ? fmtL(l('O espólio de {a}', 'The estate of {a}'), { a: a.name }) : l(a.name, a.name);
  if (!r.chance(c.p)) {
    if (a.owner === 'player') a.trust = clamp(a.trust - (t.share < fairShare(a, t.scopes) * 0.6 ? 4 : 1), 0, 100);
    const text = fmtL(l('{w} recusou (chance era {p}%).', '{w} declined (odds were {p}%).'), { w: who, p: Math.round(c.p * 100) });
    log(s, text);
    return { ok: false, text };
  }
  const fair = fairShare(a, t.scopes);
  const pred = t.share < fair * 0.6;
  if (pred) st.pred[s.year] = (st.pred[s.year] ?? 0) + 1;
  if (t.upfront) { post(s, `img17:${actId}:${s.week}`, -t.upfront, 'rights', `Direitos de imagem: ${a.name}`); a.cash += t.upfront; }
  st.deals.push({ id: `im17:${actId}:${s.week}`, act: actId, estate: est, scopes: [...t.scopes], share: t.share, fair, until: t.years > 0 ? s.year + t.years : 9999, fame0: a.fame, upfront: t.upfront, earned: 0, done: [], status: 'active', pred, y: s.year });
  const text = fmtL(l('{w} cede direitos de {sc} por {y} ({p}% para o artista).', '{w} grants {sc} rights for {y} ({p}% to the artist).'), { w: who, sc: t.scopes.map((k) => SCOPES[k].name.pt).join(', '), y: t.years > 0 ? `${t.years} anos` : 'sempre', p: Math.round(t.share * 100) });
  log(s, text);
  emitFact(s, { kind: 'consent', actors: [actId, 'player'], severity: pred ? 45 : 35, visibility: pred ? 'rumor' : 'public', tags: ['deal', 'rights', ...(pred ? ['bad', 'money'] : [])], text, src: 'image17' });
  return { ok: true, text };
}
/** Renegociar: sobe a fatia para a justa (encerra a exigência sem processo). */
export function renegotiate(s: GameState, id: string): L | null {
  const d = img17(s).deals.find((x) => x.id === id);
  const a = d && s.acts[d.act];
  if (!d || !a) return l('Inválido.', 'Invalid.');
  d.fair = fairShare(a, d.scopes);
  d.share = Math.max(d.share, d.fair);
  d.pred = false; d.status = 'active'; d.demandW = undefined;
  a.trust = clamp(a.trust + 6, 0, 100);
  log(s, fmtL(l('Acordo de imagem de {a} renegociado: agora {p}% para o artista.', '{a}\'s image deal renegotiated: now {p}% to the artist.'), { a: a.name, p: Math.round(d.share * 100) }));
  return null;
}
export function endDeal(s: GameState, id: string): void { const d = img17(s).deals.find((x) => x.id === id); if (d) d.status = 'ended'; }

registerSimHook('month', 'image17', (s) => {
  const st = img17(s);
  for (const d of st.deals) {
    const a = s.acts[d.act];
    if (!a || d.status === 'ended') continue;
    if (d.until < s.year) { d.status = 'ended'; log(s, fmtL(l('Acordo de imagem de {a} expirou.', '{a}\'s image deal expired.'), { a: a.name })); continue; }
    const r = Rng.fromSeed(`${s.config.seed}:img17m:${d.id}:${s.year}:${s.month}`);
    let gross = 0;
    const why: string[] = [];
    if (d.scopes.includes('ads') && a.fame >= 30 && (d.adsOff ?? 0) < s.week) { gross += money(s, a.fame * a.fame * 0.6); why.push('ads'); }
    if (d.scopes.includes('voice_ai') && s.year >= 2023) { gross += money(s, 25 * Math.pow(Math.max(1, a.fame), 1.25)); why.push('voice'); }
    if (d.scopes.includes('biopic') && !d.done.includes('biopic') && (a.fame >= 60 || (d.estate && a.legend)) && r.chance(0.04)) {
      d.done.push('biopic');
      const v = money(s, 50000 + a.fame * a.fame * 60);
      gross += v;
      a.fame = clamp(a.fame + 5, 0, 100); a.momentum = clamp(a.momentum + 15, 0, 100);
      const t = fmtL(l('Cinebiografia de {a} estreia: bilheteria forte e o catálogo volta a tocar.', '{a} biopic opens: strong box office and the catalog plays again.'), { a: a.name });
      log(s, t);
      emitFact(s, { kind: 'deal', actors: [a.id, 'player'], severity: 60, visibility: 'public', tags: ['good', 'film'], text: t, src: 'image17' });
    }
    if (d.scopes.includes('game') && !d.done.includes('game') && a.fame >= 45 && r.chance(0.05)) { d.done.push('game'); gross += money(s, 20000 + a.fame * 500); log(s, fmtL(l('{a} vira personagem de videogame.', '{a} becomes a video-game character.'), { a: a.name })); }
    if (d.scopes.includes('hologram') && d.estate && (d.holo ?? 0) === 0 && a.fame >= 40 && r.chance(0.06)) {
      d.holo = 12;
      const t = fmtL(l('Turnê de holograma de {a} anunciada. Metade dos fãs chora de emoção; a outra metade acha macabro.', '{a} hologram tour announced. Half the fans cry with joy; the other half find it ghoulish.'), { a: a.name });
      log(s, t);
      emitFact(s, { kind: 'statement', actors: [a.id, 'player'], severity: 50, visibility: 'public', tags: ['rights', 'hologram'], text: t, src: 'image17' });
    }
    if ((d.holo ?? 0) > 0) { gross += money(s, a.fame * a.fame * 18); d.holo = (d.holo ?? 0) - 1; }
    if (gross > 0) {
      const art = Math.round(gross * d.share);
      post(s, `img17m:${d.id}:${s.month}`, gross - art, 'rights', `Imagem: ${a.name}`);
      a.cash += art;
      d.earned += gross - art;
    }
    // abuso cobra a conta: o artista cresce e exige renegociação; ignorado, processa
    if (d.pred && !d.estate && d.status === 'active' && (a.fame > d.fame0 + 15 || r.chance(0.02))) {
      d.status = 'demand'; d.demandW = s.week;
      grantHold(s, { holder: a.id, target: 'player', kind: 'grievance', strength: 50, months: 48, src: 'image17', text: fmtL(l('{a} descobriu quanto vale a própria imagem — e quanto você paga.', '{a} found out what their image is worth — and what you pay.'), { a: a.name }) });
      const t = fmtL(l('{a} exige renegociar o acordo de imagem ("assinei sem saber"). Você tem 6 meses.', '{a} demands to renegotiate the image deal ("I signed without knowing"). You have 6 months.'), { a: a.name });
      log(s, t); notify(s, t, 'bad');
    }
    if (d.status === 'demand' && s.week - (d.demandW ?? s.week) > 26) {
      const legal = s.player.staff.filter((x) => x.role === 'legal').reduce((t, x) => Math.max(t, x.skill), 0) / 100;
      const win = r.chance(clamp(0.3 + legal * 0.4, 0.15, 0.75));
      const cost = money(s, 8000 + a.fame * 300);
      post(s, `img17case:${d.id}`, -(win ? Math.round(cost * 0.4) : cost + Math.round(d.earned * 0.5)), 'legal', `Processo de imagem: ${a.name}`);
      const t = fmtL(win ? l('{a} processou pelo acordo de imagem e perdeu — mas a história pegou mal.', '{a} sued over the image deal and lost — but the story looks bad.') : l('{a} ganha o processo: acordo anulado e indenização paga. "Exploração", dizem os jornais.', '{a} wins the case: deal voided and damages paid. "Exploitation", say the papers.'), { a: a.name });
      log(s, t);
      scandal(s, a.id, 'money', win ? 25 : 45, t, {});
      emitFact(s, { kind: 'case_ruling', actors: [a.id, 'player'], severity: win ? 40 : 60, visibility: 'public', tags: ['rights', 'law', win ? 'good' : 'bad'], text: t, src: 'image17' });
      s.player.reputation.artists = clamp(s.player.reputation.artists - (win ? 3 : 8), 0, 100);
      d.status = win ? 'active' : 'ended'; d.pred = false;
    }
  }
});

// escândalo: anunciantes suspendem campanhas por 6 meses; morte: o espólio herda o acordo
onFact('scandal', (s, f) => {
  if (f.severity < 35) return;
  for (const id of f.actors) { const d = activeDeal(s, id); if (d && d.scopes.includes('ads')) { d.adsOff = s.week + 26; log(s, fmtL(l('Anunciantes suspendem campanhas com {a} depois do escândalo.', 'Advertisers pause campaigns with {a} after the scandal.'), { a: s.acts[id]?.name ?? '' })); } }
}, 'image17:scandal');
onFact('death', (s, f) => {
  for (const id of f.actors) { const a = s.acts[id]; const d = a && activeDeal(s, id); if (a && d && !d.estate && isEstate(s, a)) { d.estate = true; d.pred = false; if (d.status === 'demand') d.status = 'active'; log(s, fmtL(l('O espólio de {a} herda o acordo de imagem.', 'The estate of {a} inherits the image deal.'), { a: a.name })); } }
}, 'image17:death');
