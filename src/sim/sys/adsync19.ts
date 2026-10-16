// Rodada 19 (Frente 9.6) — MÚSICA EM PUBLICIDADE E JINGLES (`adsync19`). Marcas da época (data/content BRANDS, nomes
// fictícios com referência real) oferecem: JINGLE encomendado (rádio 1926+, TV 1950+), LICENÇA de uma faixa num comercial
// (1960+, comum depois de 1985) e, 2001+, o LANÇAMENTO de um desconhecido por um comercial (a era dos anúncios de tocador
// de música). Dinheiro e alcance × credibilidade: cada anúncio enche o medidor "vendido" do ato (mais se o ato é
// alternativo ou tem integrante purista); cheio → `sellout_backlash` (puristas do fans18 se revoltam, crítica cobra).
// Licença → `ad_sync` (revival19 esquenta a faixa antiga; streaming/lojas sobem; fãs casuais), jingle → `jingle`
// (reputação comercial sobe, artística cai). Cancelamento (cancel19) aciona a cláusula de conduta: a marca sai e cobra
// 25% de volta. NPCs também licenciam (a faixa velha de um rival pode voltar por um comercial).

import { Rng, clamp } from '../../core/rng';
import { BRANDS as CBRANDS, type BrandDef } from '../../data/content';
import { l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { registerConseq18 } from '../decide18';
import { homeMarket } from '../economy';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import type { Act, GameState, Release } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { headline19 } from './factlink19';
import { fan18 } from './fans18';
import { cnt19, link19, log19, mineA19, usd19, xs19, type Log19 , off19 } from './mkb19';

export type AdK19 = 'jingle' | 'license' | 'launch';
export const ADK19: Record<AdK19, { name: L; from: number; base: number; cred: number; desc: L }> = {
  jingle: { name: l('Jingle encomendado', 'Commissioned jingle'), from: 1926, base: 2500, cred: 10, desc: l('Compor e gravar um jingle para a marca (o primeiro famoso, de cereal, é de 1926).', 'Write and record a jingle for the brand (the first famous one, for cereal, dates from 1926).') },
  license: { name: l('Faixa no comercial', 'Track in the ad'), from: 1960, base: 7000, cred: 16, desc: l('Licenciar uma faixa sua para a campanha: dinheiro e alcance; a faixa volta a tocar.', 'License one of your tracks for the campaign: money and reach; the track plays again.') },
  launch: { name: l('Lançado por um comercial', 'Launched by an ad'), from: 2001, base: 3500, cred: 6, desc: l('Uma marca de tecnologia põe um desconhecido no comercial: alcance enorme, cachê pequeno.', 'A tech brand puts an unknown in its ad: huge reach, a small fee.') },
};
export const CRED_MAX19 = 60;
export interface Run19 { id: string; y: number; act: string; rel?: string; brand: string; k: AdK19; fee: number; w: number; until: number; deal?: string; off?: 1 }
export interface Ad19 extends Log19 { runs: Run19[]; cred: Record<string, number>; back: Record<string, number>; seq: number; last: number }
declare module '../ext4' { interface Ext4 { adsync19: Ad19 } }
const fresh = (): Ad19 => ({ runs: [], cred: {}, back: {}, seq: 0, last: -99, log: [], n: {} });
registerExt4('adsync19', fresh);
export const ad19 = (s: GameState): Ad19 => xs19(s, 'adsync19', fresh);
const rng = (s: GameState) => rng19(s, 'adsync19');
export const adOpen19 = (s: GameState, k: AdK19): boolean => s.year >= ADK19[k].from;
export const medium19 = (s: GameState): L => (s.year >= 2005 ? l('internet e TV', 'internet and TV') : s.year >= 1950 ? l('TV', 'TV') : s.year >= 1922 ? l('rádio', 'radio') : l('jornais e cartazes', 'newspapers and posters'));
export const brandsNow19 = (s: GameState, k: AdK19): BrandDef[] => {
  const mk = homeMarket(s);
  const ok = CBRANDS.filter((b) => s.year >= b.start && (!b.end || s.year <= b.end) && b.sync.some((x) => x === 'ad' || (k === 'jingle' && x === 'jingle')) && (k !== 'launch' || b.values.includes('tech') || b.values.includes('youth')));
  const home = ok.filter((b) => b.markets.includes(mk));
  return home.length ? home : ok;
};
const edgy = (a: Act) => a.positioning < 35;
const purist = (s: GameState, a: Act) => a.members.some((p) => s.persons[p]?.traits.includes('purist'));
/** Quanto o anúncio enche o medidor "vendido" do ato, com o porquê. */
export function credCost19(s: GameState, a: Act, k: AdK19): { v: number; why: WhyPart[] } {
  const why: WhyPart[] = [{ label: ADK19[k].name, value: ADK19[k].cred, fmt: 'signed' }];
  if (edgy(a)) why.push({ label: l('Ato alternativo/de atitude: fãs cobram coerência', 'Alternative/edgy act: fans demand consistency'), value: 10, fmt: 'signed', tone: 'bad' });
  if (purist(s, a)) why.push({ label: l('Integrante purista', 'A purist member'), value: 8, fmt: 'signed', tone: 'bad' });
  if (s.year < 1985 && k === 'license') why.push({ label: l('Antes de 1985, "vender a música" para comercial pegava mal', 'Before 1985, "selling the song" to an ad looked bad'), value: 6, fmt: 'signed', tone: 'bad' });
  if (s.year >= 2005) why.push({ label: l('Era digital: anúncio virou vitrine normal', 'Digital era: ads became a normal showcase'), value: -5, fmt: 'signed', tone: 'good' });
  return { v: Math.max(2, why.reduce((t, x) => t + Number(x.value ?? 0), 0)), why };
}
export const adFee19 = (s: GameState, a: Act, b: BrandDef, k: AdK19): number => money(s, ADK19[k].base * (b.budget / 3) * (k === 'launch' ? 1 : 0.4 + a.fame / 100) * (s.year < 1950 ? 0.6 : 1));
const bestRel = (s: GameState, a: Act): Release | undefined => a.releases.map((id) => s.releases[id]).filter((x): x is Release => !!x && x.type === 'single').sort((p, q) => q.q - p.q)[0];

function offer(s: GameState, a: Act, k: AdK19, r: Rng): boolean {
  const b = r.pick(brandsNow19(s, k));
  const rel = k === 'jingle' ? undefined : bestRel(s, a);
  if (!b || (k !== 'jingle' && !rel)) return false;
  const fee = Math.round(adFee19(s, a, b, k) * r.float(0.85, 1.2)), cc = credCost19(s, a, k).v;
  pushInbox18(s, 'ad19_offer', { from: b.name, tone: 'info',
    subject: fmtL(k === 'jingle' ? l('{b} quer um jingle de {a}', '{b} wants a jingle by {a}') : k === 'launch' ? l('{b} quer lançar {a} num comercial', '{b} wants to launch {a} in an ad') : l('{b} quer "{t}" num comercial', '{b} wants "{t}" in an ad'), { b: b.name, a: a.name, t: rel?.title ?? '' }),
    body: fmtL(l('{d} Campanha de {m}: {f}. Alcance: {r}. Credibilidade: medidor "vendido" +{c} (agora {n}/{x}). {desc}', '{d} {m} campaign: {f}. Reach: {r}. Credibility: "sell-out" meter +{c} (now {n}/{x}). {desc}'),
      { d: b.desc, m: medium19(s), f: usd19(fee), r: k === 'launch' ? l('enorme (fama +8)', 'huge (fame +8)') : k === 'license' ? l('a faixa volta a tocar', 'the track plays again') : l('o refrão gruda no país', 'the hook sticks nationwide'), c: cc, n: Math.round(ad19(s).cred[a.id] ?? 0), x: CRED_MAX19, desc: ADK19[k].desc }),
    ref: { act: a.id, rel: rel?.id ?? '', b: b.id, k, fee }, actions: [{ id: 'take', label: l('Aceitar', 'Accept') }, { id: 'haggle', label: l('Pedir +30%', 'Ask +30%') }, { id: 'no', label: l('Recusar', 'Decline') }], weeks: 5 });
  return true;
}
/** Fecha a campanha (Caixa ou interface). */
export function takeAd19(s: GameState, actId: string, bid: string, k: AdK19, fee: number, relId?: string): L | null {
  const a = s.acts[actId], b = CBRANDS.find((x) => x.id === bid), st = ad19(s);
  if (!a || !b) return l('Oferta inválida.', 'Invalid offer.');
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  if (k !== 'jingle' && c?.creativeControl && a.trust < 40 && !a.playerBand) return l('O artista vetou: não quer a música num comercial.', 'The artist vetoed it: they do not want the song in an ad.');
  const rel = relId ? s.releases[relId] : undefined;
  const mine = mineA19(a);
  if (mine) post(s, `ad19:${actId}:${bid}:${s.week}`, fee, k === 'jingle' ? 'publishing' : 'sync', `${b.name} — ${a.name} (${ADK19[k].name.pt})`);
  else a.cash += fee;
  const dl = `ad19d${st.seq + 1}`;
  s.deals.push({ id: dl, actId, brand: b.name, kind: 'sync_ad', fee, songId: rel?.songs[0], untilWeek: s.week + 52, exclusive: false, status: 'active', boost: 0.3 });
  const x: Run19 = { id: `ad${++st.seq}`, y: s.year, act: actId, ...(rel ? { rel: rel.id } : {}), brand: b.name, k, fee, w: s.week, until: s.week + 52, deal: dl };
  st.runs.push(x); if (st.runs.length > 40) st.runs.splice(0, st.runs.length - 40);
  st.cred[actId] = Math.round((st.cred[actId] ?? 0) + credCost19(s, a, k).v);
  cnt19(st, k);
  const tx = k === 'jingle' ? fmtL(l('{a} grava o jingle de {b}.', '{a} records the {b} jingle.'), { a: a.name, b: b.name }) : fmtL(k === 'launch' ? l('Comercial de {b} lança {a} com "{t}".', '{b} ad launches {a} with "{t}".') : l('"{t}" de {a} vira trilha do comercial de {b}.', '"{t}" by {a} becomes the soundtrack of the {b} ad.'), { a: a.name, b: b.name, t: rel?.title ?? '?' });
  log19(s, st, tx);
  if (k === 'jingle') emitFact(s, { kind: 'jingle', actors: [actId, ...(mine ? ['player'] : [])], severity: 15 + b.budget * 3, visibility: 'public', tags: ['adsync19', b.category], text: tx, src: 'adsync19', data: { brand: b.id, run: x.id } });
  else emitFact(s, { kind: 'ad_sync', actors: [actId, ...(mine ? ['player'] : [])], severity: 20 + b.budget * 4 + (k === 'launch' ? 10 : 0), visibility: 'public', tags: ['adsync19', k, b.category], text: tx, src: 'adsync19', data: { rel: rel?.id ?? '', brand: b.id, run: x.id } });
  if ((st.cred[actId] ?? 0) >= CRED_MAX19 && (st.back[actId] ?? -999) < s.week - 104) {
    st.back[actId] = s.week;
    emitFact(s, { kind: 'sellout_backlash', actors: [actId, ...(mine ? ['player'] : [])], severity: 35 + Math.round(a.fame / 4), visibility: 'public', tags: ['adsync19', 'bad'], text: fmtL(l('"Vendidos!": fãs antigos de {a} queimam discos depois de mais um comercial ({b}).', '"Sell-outs!": longtime {a} fans burn records after one more ad ({b}).'), { a: a.name, b: b.name }), src: 'adsync19', data: { cred: st.cred[actId] } });
  }
  return null;
}
registerInboxKind('ad19_offer', { label: l('Publicidade', 'Advertising'), cat: 'deals', icon: 'radio', prio: 1, goto: () => ({ area: 'media19' }),
  handle: (s, m, act) => {
    const R = m.ref ?? {}, a = s.acts[String(R.act)];
    if (!a) return l('Já passou.', 'Already over.');
    if (act === 'no') { const st = ad19(s); st.cred[a.id] = Math.max(0, (st.cred[a.id] ?? 0) - 5); return l('Recusado: os fãs antigos aplaudem a coerência.', 'Declined: longtime fans applaud the consistency.'); }
    let fee = Number(R.fee);
    if (act === 'haggle') { if (!rng(s).chance(0.55)) return l('A marca não aceitou e foi atrás de outro artista.', 'The brand refused and went after another artist.'); fee = Math.round(fee * 1.3); }
    return takeAd19(s, a.id, String(R.b), String(R.k) as AdK19, fee, String(R.rel || '') || undefined) ?? fmtL(l('Campanha fechada: {f}.', 'Campaign closed: {f}.'), { f: usd19(fee) });
  } });
registerConseq18('ib:ad19_offer:take', { now: l('Dinheiro e alcance; o medidor "vendido" sobe.', 'Money and reach; the "sell-out" meter rises.'), later: [{ in: [2, 8], p: 0.35, tone: 'mixed', hint: l('O refrão do comercial pode grudar — para o bem ou para o mal.', 'The ad hook may stick — for better or worse.'),
  fx: (f) => (f.r.chance(0.55) ? (f.fans(4).fame(1), l('O comercial pegou: todo mundo cantarola a música, e ela volta às rádios.', 'The ad caught on: everyone hums the song and it returns to radio.')) : (f.rep('artistic', -1).trust(-3), l('Críticos chamam a campanha de constrangedora; o artista se arrepende.', 'Critics call the campaign embarrassing; the artist regrets it.'))) }] });
registerConseq18('ib:ad19_offer:haggle', { now: l('45% de chance de a marca sair da mesa.', '45% chance the brand walks away.'), later: [{ in: [4, 12], p: 0.2, tone: 'good', hint: l('Marcas lembram de quem negocia bem.', 'Brands remember tough negotiators.'),
  fx: (f) => (f.rep('commercial', 1), l('Agências passam a tratar o selo como parceiro caro — e sério.', 'Agencies start treating the label as an expensive — and serious — partner.')) }] });
registerConseq18('ib:ad19_offer:no', { now: l('Fãs antigos aplaudem; o medidor "vendido" cai 5.', 'Longtime fans applaud; the "sell-out" meter drops 5.'), later: [{ in: [3, 10], p: 0.25, tone: 'good', hint: l('Recusar dinheiro de marca vira história.', 'Turning down brand money becomes a story.'),
  fx: (f) => (f.rep('artistic', 1).fans(2), l('A recusa vira lenda entre os fãs: "eles não se vendem".', 'The refusal becomes fan lore: "they don\'t sell out".')) }] });

export function adMonth19(s: GameState): void {
  const st = ad19(s), r = rng(s);
  for (const k of Object.keys(st.cred)) { st.cred[k] = Math.round(st.cred[k] * 0.93); if (st.cred[k] < 1) delete st.cred[k]; }
  if (!adOpen19(s, 'jingle')) return;
  // no máximo uma oferta por mês ao jogador
  if (st.last < s.week - 3) {
    for (const id of playerActs(s)) {
      const a = s.acts[id];
      if (!a || a.status === 'split' || a.status === 'retired' || (a.cancelledUntil ?? 0) > s.week) continue;
      const ks: AdK19[] = [];
      if (a.fame >= 15) ks.push('jingle');
      if (a.fame >= 20 && adOpen19(s, 'license')) ks.push('license');
      if (a.fame < 25 && adOpen19(s, 'launch')) ks.push('launch');
      if (!ks.length || !r.chance(0.035 + a.fame / 1000)) continue;
      if (offer(s, a, r.pick(ks), r)) { st.last = s.week; break; }
    }
  }
  // NPCs: um rival licencia faixa antiga (às vezes ela volta)
  if (adOpen19(s, 'license') && r.chance(0.03)) {
    const pool = Object.values(s.acts).filter((a) => !mineA19(a) && a.fame >= 30 && a.releases.length);
    const a = r.weighted(pool, (x) => x.fame), b = a && r.pick(brandsNow19(s, 'license'));
    const rel = a && a.releases.map((id) => s.releases[id]).filter((x): x is Release => !!x && s.year - x.year >= 10).sort((p, q) => q.q - p.q)[0];
    if (a && b && rel) takeAd19(s, a.id, b.id, 'license', adFee19(s, a, b, 'license'), rel.id);
  }
  for (const x of st.runs) if (!x.off && x.until <= s.week) x.off = 1;
}
registerSimHook('month', 'adsync19', (s) => off19('adsync19') || adMonth19(s));

// ---------------------------------------------------------------- ouvintes

// licença: a faixa volta às lojas/streaming (hypeBoost) e ganha fãs casuais; lançamento por comercial = fama
onFact('ad_sync', (s, f) => {
  const rel = s.releases[String(f.data?.rel ?? '')], a = s.acts[f.actors[0]];
  if (!a) return;
  const launch = f.tags.includes('launch');
  a.fans.casual += Math.round((launch ? 6000 : 1500) * (s.year >= 2000 ? 1.5 : 1));
  if (launch) a.fame = clamp(a.fame + 8, 0, 100);
  if (rel) { rel.hypeBoost = Math.min(0.5, (rel.hypeBoost ?? 0) + 0.15); }
  if (mineA19(a)) link19(s, 'adsync', fmtL(launch ? l('Comercial lança {a}: fama +8 e fãs casuais.', 'An ad launches {a}: fame +8 and casual fans.') : l('"{t}" no comercial → streaming/lojas ×1,15 e fãs casuais.', '"{t}" in the ad → streaming/stores ×1.15 and casual fans.'), { a: a.name, t: rel?.title ?? '?' }));
}, 'adsync19:reach');
// jingle: identidade do selo (reputação comercial sobe, artística cai)
onFact('jingle', (s, f) => {
  if (!f.actors.includes('player')) return;
  const R = s.player.reputation;
  R.commercial = clamp(R.commercial + 1, 0, 100);
  R.artistic = clamp(R.artistic - 0.5, 0, 100);
  link19(s, 'adsync', l('Jingle de marca: reputação comercial +1, artística −0,5.', 'Brand jingle: commercial reputation +1, artistic −0.5.'));
}, 'adsync19:id');
// vendidos: puristas (fans18) se revoltam, lealdade cai, crítica cobra; manchete
onFact('sellout_backlash', (s, f) => {
  const a = s.acts[f.actors[0]];
  const fa = a && fan18(s, a.id, false);
  if (fa) { fa.fac[0] = clamp(fa.fac[0] - 15, -50, 50); fa.loy = clamp(fa.loy - 6, 0, 100); }
  if (a) { const fd = s.fandoms[a.id]; if (fd) fd.haters += Math.round(a.fans.core * 0.05); }
  if (f.actors.includes('player')) s.player.reputation.artistic = clamp(s.player.reputation.artistic - 1, 0, 100);
  headline19(s, f.text, 2);
  if (a && mineA19(a)) link19(s, 'adsync', fmtL(l('Medidor "vendido" cheio: puristas de {a} −15, lealdade −6.', '"Sell-out" meter full: {a} purists −15, loyalty −6.'), { a: a.name }));
}, 'adsync19:fans');
// cancelamento (cancel19): cláusula de conduta — a marca sai e cobra 25% de volta
onFact('cancel_wave', (s, f) => {
  const st = ad19(s);
  for (const x of st.runs) {
    if (x.off || x.act !== f.actors[0]) continue;
    x.off = 1;
    const d = s.deals.find((y) => y.id === x.deal); if (d) d.status = 'done';
    if (mineA19(s.acts[x.act])) {
      post(s, `ad19claw:${x.id}`, -Math.round(x.fee * 0.25), 'legal', `Cláusula de conduta: ${x.brand}`);
      link19(s, 'cancel', fmtL(l('{b} aciona a cláusula de conduta: campanha cancelada e {v} devolvidos.', '{b} triggers the conduct clause: campaign cancelled and {v} returned.'), { b: x.brand, v: usd19(Math.round(x.fee * 0.25)) }));
    }
  }
}, 'adsync19:clause');

// ---------------------------------------------------------------- calendário e porquê
registerDeadline('adsync19', (s, from, to) => ad19(s).runs.filter((x) => !x.off && x.until >= from && x.until <= to && mineA19(s.acts[x.act])).map((x) => ({
  id: `adsync19-${x.id}`, w: x.until, kind: 'contract' as const, t: fmtL(l('Campanha de {b} termina ({a})', '{b} campaign ends ({a})'), { b: x.brand, a: s.acts[x.act]?.name ?? '?' }), tone: 'info' as const, goto: { area: 'media19' } })));
registerExplain('ad19.cred', (s, c) => {
  const a = s.acts[String(c.act ?? '')];
  if (!a) return null;
  const st = ad19(s), runs = st.runs.filter((x) => x.act === a.id).slice(-6);
  const parts: WhyPart[] = runs.map((x) => ({ label: fmtL(l('{b} ({y}): {k}', '{b} ({y}): {k}'), { b: x.brand, y: x.y, k: ADK19[x.k].name }), value: x.fee, fmt: 'money' }));
  parts.push(...credCost19(s, a, 'license').why);
  parts.push({ label: l('Esquece 7% por mês', 'Fades 7% a month'), value: 0.93, fmt: 'mult', tone: 'good' });
  return { title: fmtL(l('Medidor "vendido" de {a}', '{a}\'s "sell-out" meter'), { a: a.name }), value: Math.round(st.cred[a.id] ?? 0), fmt: 'num', parts, note: fmtL(l('Com {x}+ os fãs puristas se revoltam (no máximo uma vez a cada 2 anos).', 'At {x}+ purist fans revolt (at most once every 2 years).'), { x: CRED_MAX19 }) };
});
