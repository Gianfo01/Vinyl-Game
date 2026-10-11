// Rodada 19 (Onda 5, A.7) — ECONOMIA INTERNA ENTRE NEGÓCIOS DO JOGADOR. Todo serviço entre dois negócios seus
// (o produtor que é você no disco do seu selo, o seu ato no seu festival, o seu estúdio gravando o seu selo, o seu
// veículo tocando o seu ato, a sua editora com obras gravadas pelo seu selo) vira DÉBITO num negócio e CRÉDITO no
// outro, a preço de mercado, marcado `rel:` no livro. A DRE de cada negócio mantém; a consolidada elimina (ledger18
// `int:rev/int:cost`, consolOp18). Opção "desconto da casa" por tipo de serviço: mais barato para quem paga, mas o
// artista sente (holds17: favor ou mágoa). Avisos de conflito de interesse quando dois chapéus seus se encontram.
// Nada aqui cria dinheiro: a soma de caixa + patrimônio só muda pelo que vai para fora (artista, fornecedor).

import { clamp } from '../../core/rng';
import { MEDIA } from './ventures9';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { grantHold } from '../holds17';
import { registerExplain } from '../explain18';
import type { GameState } from '../types';
import { fmtL, money, notify } from '../util';
import { registerAdvisorTip } from '../inbox18';
import { guestFee } from './live/festival';
import { isMine, liveOf, liveShare } from './live/state';
import { guestPaid19, houseAsk19, ownPaid19, ventureOf } from './fest12';
import { prodOwn19 } from './studio12';
import { pubOwn19, ventures, vpay, type Holder, type Venture } from './ventures9';

export type HouseK = 'prod' | 'fest' | 'studio' | 'media';
export type HouseP = 'market' | 'discount';
export interface Tally19 { inn: number; out: number }
export interface Intra19State {
  house: Record<HouseK, HouseP>;
  /** por ano → negócio (tag) → recebido/pago de outros negócios seus (centavos) */
  y: Record<number, Record<string, Tally19>>;
  /** avisos de conflito já dados (chave → semana) */
  warned: Record<string, number>;
  seq: number;
  log: { w: number; t: L }[];
}
declare module '../ext4' { interface Ext4 { intra19: Intra19State } }
const fresh = (): Intra19State => ({ house: { prod: 'market', fest: 'market', studio: 'market', media: 'market' }, y: {}, warned: {}, seq: 0, log: [] });
registerExt4('intra19', fresh);
export function intra19(s: GameState): Intra19State {
  const x = s.x4 as unknown as { intra19?: Intra19State };
  const st = (x.intra19 ??= fresh());
  st.house ??= fresh().house; st.y ??= {}; st.warned ??= {}; st.log ??= [];
  return st;
}

export const HOUSE_NAME: Record<HouseK, L> = {
  prod: l('Você produzindo discos do seu selo', 'You producing your label\'s records'),
  fest: l('Seus artistas no seu festival', 'Your acts at your festival'),
  studio: l('Seu estúdio gravando o seu selo', 'Your studio recording your label'),
  media: l('Seu veículo tocando os seus artistas', 'Your outlet playing your acts'),
};
export const HOUSE_DESC: Record<HouseK, Record<HouseP, L>> = {
  prod: { market: l('O selo paga o cachê cheio ao produtor (você). Entra no recuperável do artista, como num contrato de verdade.', 'The label pays the producer (you) the full fee. It goes into the artist\'s recoupable, as in a real deal.'),
    discount: l('Metade do cachê: o selo economiza e o artista fica devendo um favor.', 'Half the fee: the label saves and the artist owes you a favor.') },
  fest: { market: l('O festival paga o cachê de mercado: o artista recebe, o selo leva a parte do contrato (360/banda própria).', 'The festival pays the market fee: the artist gets it, the label takes its contract share (360/own band).'),
    discount: l('40% do cachê "pela casa": o festival lucra mais, mas o artista pode se magoar.', '40% of the fee "for the house": the festival makes more, but the act may resent it.') },
  studio: { market: l('Cada faixa do selo gravada no seu estúdio paga a sessão de mercado (recuperável do artista).', 'Each label track cut at your studio pays the market session rate (recoupable from the artist).'),
    discount: l('Sessão a preço de custo (metade): o estúdio fatura menos, o artista agradece.', 'Sessions at cost (half): the studio bills less, the act is grateful.') },
  media: { market: l('O selo compra o espaço que o seu veículo dá ao seu artista favorecido, ao preço da publicidade.', 'The label buys the space your outlet gives your favored act, at the ad rate.'),
    discount: l('Espaço de graça: o veículo perde receita e credibilidade (o público percebe o jabá caseiro).', 'Free space: the outlet loses revenue and credibility (the audience notices the in-house plugging).') },
};
export const setHouse19 = (s: GameState, k: HouseK, p: HouseP): void => { intra19(s).house[k] = p; };

// ---------------------------------------------------------------- negócios e a transferência

export interface Biz19 { h: Holder; v?: Venture; tag: string }
export const bizLabel19: Biz19 = { h: 'label', tag: 'label' };
export const bizProd19: Biz19 = { h: 'personal', tag: 'producer' };
export const bizMgr19 = (s: GameState): Biz19 => ({ h: ventures(s).mg.owner, tag: 'manager' });
export const bizV19 = (v: Venture): Biz19 => ({ h: v.owner, v, tag: v.id });

function tally(s: GameState, tag: string, d: 'inn' | 'out', amt: number): void {
  const Y = (intra19(s).y[s.year] ??= {});
  const t = (Y[tag] ??= { inn: 0, out: 0 });
  t[d] += amt;
  for (const k of Object.keys(intra19(s).y)) if (Number(k) < s.year - 6) delete intra19(s).y[Number(k)];
}

/** Débito em um negócio e crédito no outro (mesmo valor). Devolve o valor movido. */
export function intraPay19(s: GameState, from: Biz19, to: Biz19, amt: number, key: string, memo: string): number {
  amt = Math.round(amt);
  if (amt <= 0) return 0;
  const st = intra19(s);
  const k = `rel:${key}:${++st.seq}`;
  vpay(s, from.h, -amt, `${k}:out`, `${memo} (interno)`, from.v);
  vpay(s, to.h, amt, `${k}:in`, `${memo} (interno)`, to.v);
  tally(s, from.tag, 'out', amt);
  tally(s, to.tag, 'inn', amt);
  return amt;
}

const logT = (s: GameState, t: L) => { const st = intra19(s); st.log.push({ w: s.week, t }); if (st.log.length > 30) st.log.shift(); };

/** Aviso de conflito de interesse: uma vez por par a cada 2 anos (vai para a memória e as notificações). */
export function conflict19(s: GameState, key: string, t: L): void {
  const st = intra19(s);
  if (st.warned[key] !== undefined && s.week - st.warned[key] < 104) return;
  st.warned[key] = s.week;
  notify(s, fmtL(l('Conflito de interesse: {t}', 'Conflict of interest: {t}'), { t }), 'info');
  logT(s, t);
}

/** Conflitos abertos agora (para a tela de Finanças e o conselheiro). */
export function conflicts19(s: GameState): { k: string; t: L }[] {
  const out: { k: string; t: L }[] = [];
  const vs = ventures(s).list;
  const mg = ventures(s).mg;
  const clients = new Set(mg.clients.map((c) => c.actId));
  for (const f of liveOf(s).fests) for (const y of f.lineup) {
    const a = s.acts[y.actId];
    if (!a) continue;
    if (isMine(s, a.id)) out.push({ k: `fest:${f.id}:${a.id}`, t: fmtL(l('{a} (seu selo) toca no {f} (seu festival): você negocia dos dois lados da mesa.', '{a} (your label) plays {f} (your festival): you sit on both sides of the table.'), { a: a.name, f: f.name }) });
    else if (clients.has(a.id)) out.push({ k: `festc:${f.id}:${a.id}`, t: fmtL(l('{a} é seu cliente e toca no {f} (seu festival): a comissão sai do cachê que o seu festival paga.', '{a} is your client and plays {f} (your festival): your commission comes out of the fee your festival pays.'), { a: a.name, f: f.name }) });
  }
  for (const v of vs) if (v.kind === 'media' && v.favored) {
    const a = s.acts[v.favored];
    if (a && (a.owner === 'player' || clients.has(a.id))) out.push({ k: `media:${v.id}:${a.id}`, t: fmtL(l('{n} (seu veículo) favorece {a}, que é {w}: a crítica e o público desconfiam.', '{n} (your outlet) favors {a}, who is {w}: critics and the public grow suspicious.'), { n: v.name, a: a.name, w: a.owner === 'player' ? l('do seu selo', 'on your label') : l('seu cliente', 'your client') }) });
  }
  for (const c of mg.clients) {
    const a = s.acts[c.actId];
    const k = a?.contractId ? s.contracts[a.contractId] : undefined;
    if (a && k?.party === 'player' && k.endWeek > s.week) out.push({ k: `mglab:${a.id}`, t: fmtL(l('Você empresaria {a} e é dono do selo dele: quem defende o artista na renegociação?', 'You manage {a} and own their label: who defends the artist in the renegotiation?'), { a: a.name }) });
  }
  return out;
}

// ---------------------------------------------------------------- 1) produtor (você) no disco do seu selo

prodOwn19.f = (s, a, amt, why) => {
  const st = intra19(s);
  const disc = st.house.prod === 'discount';
  const pay = intraPay19(s, bizLabel19, bizProd19, disc ? amt * 0.5 : amt, `prod:${a.id}`, `Produção do disco de ${a.name}`);
  const k = a.contractId ? s.contracts[a.contractId] : undefined;
  if (disc) {
    grantHold(s, { holder: 'player', target: a.id, kind: 'favor', strength: 20, months: 24, text: l('Produziu o disco pela metade do cachê (desconto da casa).', 'Produced the record at half the fee (house discount).'), src: 'intra19', quiet: true });
    a.trust = clamp(a.trust + 2, 0, 100);
    why.push(l('Desconto da casa: o selo pagou metade; o artista fica devendo um favor.', 'House discount: the label paid half; the act owes you a favor.'));
  } else {
    if (k && k.party === 'player' && !a.playerBand) k.recoupBalance += pay;
    if (a.trust < 50 && !a.playerBand) grantHold(s, { holder: a.id, target: 'player', kind: 'grievance', strength: 15, months: 18, text: l('O dono do selo se pagou a preço cheio como produtor — e pôs na conta do artista.', 'The label owner paid himself full price as producer — and charged it to the artist.'), src: 'intra19', quiet: true });
    why.push(l('Preço de mercado: o selo pagou o produtor (você); entra no recuperável do artista.', 'Market price: the label paid the producer (you); it goes into the artist\'s recoupable.'));
  }
  why.push(l('Conflito de interesse: produtor e selo são seus — transferência interna, eliminada no consolidado.', 'Conflict of interest: producer and label are both yours — an internal transfer, eliminated in the consolidated view.'));
  conflict19(s, `prod:${a.id}`, fmtL(l('você produz o disco de {a} para o seu próprio selo.', 'you produce {a}\'s record for your own label.'), { a: a.name }));
  emitFact(s, { kind: 'house_deal', actors: ['player', a.id], severity: disc ? 25 : 10, text: fmtL(disc ? l('{a} grava com o produtor da casa pela metade do preço.', '{a} records with the house producer at half price.') : l('{a} paga preço cheio ao produtor, que é o dono do selo.', '{a} pays full price to the producer, who owns the label.'), { a: a.name }), src: 'intra19', data: { k: 'prod', disc: disc ? 1 : 0 } });
  return pay;
};

// ---------------------------------------------------------------- 2) seu ato / seu cliente no seu festival

houseAsk19.f = (s, f, a, k) => {
  const disc = intra19(s).house.fest === 'discount';
  const why = [...k.why];
  why.push(disc ? l('Artista do seu selo — desconto da casa: 40% do cachê de mercado. Pode magoar quem toca.', 'Your own act — house discount: 40% of the market fee. May sting the act.')
    : l('Artista do seu selo: cachê de mercado, pago pelo festival (transferência interna para o selo/artista).', 'Your own act: market fee, paid by the festival (internal transfer to the label/act).'));
  why.push(l('Conflito de interesse: você está dos dois lados da negociação.', 'Conflict of interest: you are on both sides of the deal.'));
  return { ...k, fee: Math.round(disc ? k.fee * 0.4 : k.fee), why };
};
ownPaid19.f = (s, f, a, fee) => {
  const v = ventureOf(s, f.id);
  if (!v) return;
  const share = liveShare(s, a.id);
  const toLabel = Math.round(fee * share), toAct = Math.max(0, fee - toLabel);
  if (toLabel) intraPay19(s, bizV19(v), bizLabel19, toLabel, `fest:${f.id}:${a.id}`, `${f.name}: cachê de ${a.name}`);
  if (toAct) { vpay(s, v.owner, -toAct, `f19own:${f.id}:${a.id}`, `${f.name}: cachê de ${a.name} (artista)`, v); a.cash += toAct; }
  const market = money(s, guestFee(s, a));
  const disc = fee < market * 0.6;
  if (disc && !a.playerBand) {
    a.trust = clamp(a.trust - 3, 0, 100);
    if (a.trust < 70) grantHold(s, { holder: a.id, target: 'player', kind: 'grievance', strength: 20, months: 18, text: fmtL(l('Tocou no festival do dono por um cachê "da casa" no {f}.', 'Played the owner\'s festival for a "house" fee at {f}.'), { f: f.name }), src: 'intra19', quiet: true });
  } else if (!a.playerBand) a.trust = clamp(a.trust + 1, 0, 100);
  conflict19(s, `fest:${f.id}:${a.id}`, fmtL(l('{a}, do seu selo, tocou no {f}, o seu festival ({c}).', '{a}, on your label, played {f}, your festival ({c}).'), { a: a.name, f: f.name, c: disc ? l('desconto da casa', 'house discount') : l('cachê de mercado', 'market fee') }));
  if (disc) emitFact(s, { kind: 'house_deal', actors: ['player', a.id], severity: 30, text: fmtL(l('{a} toca no festival do próprio dono por um cachê simbólico.', '{a} plays their own boss\'s festival for a token fee.'), { a: a.name }), place: f.cityId, src: 'intra19', data: { k: 'fest', disc: 1 } });
};
guestPaid19.f = (s, f, a, fee) => {
  const mg = ventures(s).mg;
  const c = mg.clients.find((x) => x.actId === a.id);
  if (!c || fee <= 0) return;
  const com = Math.round(fee * c.rate);
  a.cash -= com;
  vpay(s, mg.owner, com, `m19fest:${f.id}:${a.id}`, `Comissão de empresário: ${a.name} no ${f.name}`);
  c.earned += com; mg.total += com;
  conflict19(s, `festc:${f.id}:${a.id}`, fmtL(l('{a} é seu cliente e tocou no {f}, o seu festival: a sua comissão saiu do cachê que você mesmo pagou.', '{a} is your client and played {f}, your festival: your commission came out of the fee you paid.'), { a: a.name, f: f.name }));
};

// ---------------------------------------------------------------- 3) seu estúdio gravando o seu selo

const sessPrice19 = (s: GameState, v: Venture): number => money(s, 700 * (1 + (v.gear ?? 0) * 0.3));
registerSimHook('record', 'intra19:studio', (s, _r, arg) => {
  const song = arg.song;
  const a = song ? s.acts[song.actId] : undefined;
  if (!song || !a || (a.owner !== 'player' && !a.playerBand)) return;
  const st = ventures(s).list.filter((v) => v.kind === 'studio').sort((x, y) => (y.sound ?? 0) - (x.sound ?? 0))[0];
  if (!st || (st.sound ?? 0) < 5) return; // sem "som da casa" relevante o disco não passou pelo seu estúdio
  const disc = intra19(s).house.studio === 'discount';
  const p = intraPay19(s, bizLabel19, bizV19(st), sessPrice19(s, st) * (disc ? 0.5 : 1), `sess:${st.id}:${song.id}`, `Sessão no ${st.name}: ${a.name}`);
  const k = a.contractId ? s.contracts[a.contractId] : undefined;
  if (!disc && k && k.party === 'player' && !a.playerBand) k.recoupBalance += p;
  if (disc && !a.playerBand) a.trust = clamp(a.trust + 0.3, 0, 100);
});

// ---------------------------------------------------------------- 4) seu veículo tocando o seu ato, 5) sua editora

pubOwn19.is = (s, actId) => { const a = s.acts[actId]; return !!a && (a.owner === 'player' || !!a.playerBand); };
pubOwn19.pay = (s, v, amt) => { intraPay19(s, bizLabel19, bizV19(v), amt, `mech:${v.id}`, `Mecânica de obras de ${v.name} gravadas pelo selo`); };

registerSimHook('month', 'intra19', (s) => {
  const st = intra19(s);
  for (const v of ventures(s).list) {
    if (v.kind !== 'media' || !v.favored) continue;
    const a = s.acts[v.favored];
    if (!a || a.owner !== 'player') continue;
    conflict19(s, `media:${v.id}:${a.id}`, fmtL(l('{n}, o seu veículo, favorece {a}, do seu selo.', '{n}, your outlet, favors {a}, on your label.'), { n: v.name, a: a.name }));
    if (st.house.media === 'discount') { v.rep = clamp(v.rep - 0.3, 0, 100); continue; }
    intraPay19(s, bizLabel19, bizV19(v), money(s, MEDIA[v.media ?? 'magazine'].ad) * ((v.reach ?? 0) / 50) * 0.3, `media:${v.id}`, `Espaço no ${v.name} para ${a.name}`);
  }
  // empresário × próprio selo: avisa uma vez
  for (const c of ventures(s).mg.clients) {
    const a = s.acts[c.actId];
    const k = a?.contractId ? s.contracts[a.contractId] : undefined;
    if (a && k?.party === 'player' && k.endWeek > s.week) conflict19(s, `mglab:${a.id}`, fmtL(l('você empresaria {a} e é dono do selo dele.', 'you manage {a} and own their label.'), { a: a.name }));
  }
});

// ---------------------------------------------------------------- consolidado

/** Resultado interno do ano: quanto cada negócio recebeu/pagou a outros negócios seus. A soma de `inn` = soma de `out`. */
export function intraYear19(s: GameState, y = s.year): Record<string, Tally19> { return intra19(s).y[y] ?? {}; }
export const intraTotal19 = (s: GameState, y = s.year): number => Object.values(intraYear19(s, y)).reduce((t, x) => t + x.inn, 0);

/** Fato `house_deal` → a fama do dono entre artistas: desconto da casa com o próprio elenco espalha (efeito real). */
onFact('house_deal', (s, f) => {
  if (Number(f.data?.disc ?? 0) !== 1) return;
  const R = s.player.reputation;
  R.artists = clamp(R.artists - 0.4, 0, 100);
}, 'intra19:house');

registerExplain('intra19.house', (s) => {
  const st = intra19(s);
  const tot = intraTotal19(s);
  return { title: l('Transferências internas no ano', 'Internal transfers this year'), value: tot, fmt: 'money',
    parts: (Object.keys(st.house) as HouseK[]).map((k) => ({ label: fmtL(l('{n}: {p}', '{n}: {p}'), { n: HOUSE_NAME[k], p: st.house[k] === 'market' ? l('preço de mercado', 'market price') : l('desconto da casa', 'house discount') }), note: HOUSE_DESC[k][st.house[k]] })),
    note: l('Dinheiro entre negócios seus não é lucro do grupo: a DRE de cada negócio mostra, a consolidada elimina.', 'Money between your own businesses is not group profit: each business\'s P&L shows it, the consolidated one eliminates it.') };
});

registerAdvisorTip('intra19', (s) => {
  const c = conflicts19(s);
  if (!c.length) return [];
  return [{ id: 'intra19-conf', level: 'info', cat: 'career', text: fmtL(l('{n} conflito(s) de interesse entre os seus negócios.', '{n} conflict(s) of interest between your businesses.'), { n: c.length }), why: c.slice(0, 3).map((x) => x.t), goto: { area: 'business', tab: ['business', 'grupo19'] } }];
});

