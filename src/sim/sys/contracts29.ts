// R29 (contratos+) — os três modelos de contrato que estavam bloqueados ("fase posterior") agora jogáveis, em cima dos
// sistemas que já existem (termos puros em ../terms29.ts; documentação em docs/contratos29.md):
//
//  • EMPRESARIAMENTO (management): a proposta/mesa de sempre; o aceite NÃO tira o ato do selo dele — você vira o empresário
//    (cliente em ventures9 mg.clients, a mesma máquina de comissão, crises, demissão e reputação da carreira de empresário;
//    as ações de carreira — turnê, negociar com o selo, campanha — ficam na Gestão de artistas). Se você ainda não é
//    empresário, a carreira começa agora (careers12.startCareer). Conflito de interesse: se o ato vier para o seu selo, a
//    confiança e a satisfação caem todo mês. Saídas: prazo, você deixa a gestão, o artista demite você (satisfação baixa).
//  • PRODUÇÃO (production): contrato normal (a produtora = você é dona dos masters). Lançar pelo seu selo é o lançamento de
//    sempre (royalty = a parte do artista). Entregar a um selo rival: licença (adiantamento por master + pontos, que
//    recuperam o adiantamento antes de pagar) ou venda (preço único). O artista recebe a parte combinada de tudo o que a
//    produtora recebe (abatendo o adiantamento dele). Liquidação do disco entregue: market.ts → PROD29.dist.
//  • JOINT VENTURE (jv): contrato normal + um subselo (sublabels.ts) co-propriedade sua (founderShare) e do artista (sócio
//    no conselho). O adiantamento vira o capital do selo. Todo dezembro o lucro distribuível é dividido pela participação;
//    meta de lançamentos no prazo; compra da parte do artista; dissolução (multa se a meta não estiver cumprida); o artista
//    sai da sociedade se a confiança desabar. O subselo lança pela máquina de sempre (estratégia "catálogo").
//
// NPC não oferece estes modelos (só o jogador; documentado). Sem sorteio no fluxo comum: sorte só por Rng.fromSeed
// (`prod29`, `jv29`). Estado só dentro do Contract (x29) e do SubLabel — nada novo no x4.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { endContract, registerContractHook, special29 } from '../contracts';
import { launchNpcRelease, prod29 } from '../market';
import { unreleasedRecorded } from '../production';
import { registerSimHook } from '../ext4';
import { actHasTrait, mainAmbition } from '../people';
import { defaultRights } from '../rights';
import { subLabelValuation } from '../sublabels';
import { cashWhy20, freeCash20 } from '../oblig20';
import type { Act, Contract, GameState, Release } from '../types';
import type { SubLabel } from '../xtypes';
import { fmtL, money, nextId, notify, post, remember } from '../util';
import {
  END29_NAME, PROD_PTS29, active29, commissionOf29, isSpecial29, shareOf29, targetOf29, type Delivery29, type End29,
} from '../terms29';
import { careers, startCareer } from './careers12';
import { m14 } from './managers14';
import { armPromises28 } from './promises28';
import { activeAct } from './ventures12';
import { dropClient, mgAdj9, mgCap, ventures, type Client } from './ventures9';
import { studios } from './studio12';

const MGR = (s: GameState) => ventures(s).mg;
const clientOf = (s: GameState, actId: string): Client | undefined => MGR(s).clients.find((c) => c.actId === actId);
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;

// ---------------------------------------------------------------- quem pode receber a proposta

special29().eligible = (s, act, model) => {
  if (model === 'jv' && s.config.role === 'artist') return { ok: false, why: l('Joint venture é um selo: exige uma empresa (gravadora ou híbrido).', 'A joint venture is a label: it needs a company (label or hybrid).') };
  if (model !== 'management') return null;
  if (act.playerBand) return { ok: false, why: l('É a sua própria banda.', 'It is your own band.') };
  if (act.owner === 'player') return { ok: false, why: l('Já é do seu selo: selo e empresário na mesma mão é conflito de interesse.', 'Already on your label: label and manager in the same hands is a conflict of interest.') };
  if (act.status === 'retired') return { ok: false, why: l('Aposentado: não precisa de empresário.', 'Retired: no need for a manager.') };
  if (act.status === 'split' || !act.members.some((id) => s.persons[id]?.alive)) return { ok: false, why: l('A formação acabou: não há carreira para gerir.', 'The act broke up: no career to manage.') };
  if (clientOf(s, act.id)) return { ok: false, why: l('Você já empresaria este ato.', 'You already manage this act.') };
  if (MGR(s).clients.length >= mgCap(s)) return { ok: false, why: l('Você não dá conta de mais artistas (a reputação de empresário aumenta o limite).', 'You cannot handle more acts (manager reputation raises the cap).') };
  return { ok: true };
};

/** Empresariamento: o "alcance" que pesa é o do empresário (reputação, carreira ativa, ser dono de selo forte ajuda pouco). */
special29().reach = (s, _act, model) => (model === 'management' ? MGR(s).rep / 45 + (careers(s).active.includes('manager') ? 0.25 : 0) + s.player.reputation.commercial / 400 : null);

// ---------------------------------------------------------------- avaliação: ambições, traços e carreira

registerContractHook('c29.fit', {
  offer: (s, act, o) => {
    if (!isSpecial29(o.model)) return null;
    if (o.model === 'management') {
      const v = (actHasTrait(s, act, 'ambitious') || actHasTrait(s, act, 'competitive') ? 0.06 : 0) - (actHasTrait(s, act, 'loner') || actHasTrait(s, act, 'rebel') ? 0.04 : 0) - Math.max(0, commissionOf29(o) - 0.2) * 1.2;
      return v ? { score: v, reason: v > 0 ? l('Carreiristas querem alguém cuidando da carreira.', 'Careerists want someone running their career.') : l('Comissão alta ou gente que não gosta de ser gerida.', 'High commission or people who dislike being managed.') } : null;
    }
    if (o.model === 'production') {
      const studioPeople = act.members.some((id) => s.persons[id]?.role === 'producer') || actHasTrait(s, act, 'perfectionist') || actHasTrait(s, act, 'virtuoso') || actHasTrait(s, act, 'experimental');
      const v = (studioPeople ? 0.07 : 0) + (studios(s).length ? 0.04 : 0);
      return v ? { score: v, reason: l('Gente de estúdio gosta de produtora (e de um estúdio de verdade por trás).', 'Studio people like a production company (and a real studio behind it).') } : null;
    }
    const indep = actHasTrait(s, act, 'rebel') || mainAmbition(s, act) === 'freedom';
    const tooHard = targetOf29(o) > Math.max(1, o.termMonths / 9);
    const v = (indep ? 0.07 : 0) + (act.fame >= 25 ? 0.04 : 0) - (tooHard ? 0.06 : 0);
    return v ? { score: v, reason: tooHard ? l('A meta de lançamentos é puxada demais para o prazo.', 'The release target is too steep for the term.') : l('Independentes querem um selo que também seja deles.', 'Independents want a label that is also theirs.') } : null;
  },
});

registerContractHook('c29.mgr', {
  offer: (s, act, o) => {
    if (o.model !== 'management') return null;
    const mg = MGR(s);
    const fired = mg.fired.some((f) => f.actId === act.id && s.year - f.y < 5);
    const rival = !!m14(s).rep[act.id];
    // a mesma régua da carreira de empresário (ventures9 mgAdj9: rival que já o representa, rixas…)
    const v = mgAdj9.reduce((t, f) => t + f(s, act), 0) - (fired ? 0.3 : 0) - (rival ? 0.06 : 0) - Math.max(0, act.fame - mg.rep) / 300;
    return v ? { score: v, reason: fired ? l('Já demitiram você como empresário há pouco.', 'They fired you as manager not long ago.') : rival ? l('Já têm empresário: trocar exige convencer.', 'They already have a manager: switching takes convincing.') : l('Sua reputação de empresário ainda é pequena para o tamanho deles.', 'Your manager reputation is still small for their size.') } : null;
  },
});

// ---------------------------------------------------------------- aceite

const promisesOf = (s: GameState, kinds: Contract['promises'][number]['kind'][], termWeeks: number) =>
  kinds.map((kind) => ({ kind, dueWeek: s.week + (kind === 'priority' ? 52 : kind === 'tour' ? 26 : termWeeks) }));

/** Empresariamento: contrato guardado, cliente na carteira, o ato continua no selo dele. */
special29().accept = (s, act, o) => {
  if (o.model !== 'management') return false;
  o.status = 'accepted';
  const rate = commissionOf29(o);
  if (!careers(s).active.includes('manager')) startCareer(s, 'manager'); // a carreira de empresário começa com o primeiro cliente
  const mg = MGR(s);
  if (!clientOf(s, act.id)) mg.clients.push({ actId: act.id, rate, since: s.week, sat: Math.round(clamp(55 + (act.trust - 50) / 5, 35, 80)), earned: 0 });
  delete m14(s).rep[act.id]; // o empresário NPC perde o cliente
  const termWeeks = Math.round(o.termMonths * 4.35);
  const id = nextId(s, 'k');
  const c: Contract = {
    id, actId: act.id, party: 'player', model: 'management', advance: o.advance, royalty: 0, termMonths: o.termMonths,
    startWeek: s.week, endWeek: s.week + termWeeks, releasesOwed: 0, releasesDone: 0, creativeControl: true, publishing: false, share360: 0,
    recoupBalance: 0, promises: promisesOf(s, o.promises, termWeeks), fameAtSign: Math.round(act.fame * 10) / 10,
    rights: o.rights ? { ...o.rights } : defaultRights('management'), x29: { commission: rate, paid: 0 },
  };
  s.contracts[id] = c;
  armPromises28(s, c);
  if (o.advance > 0) { act.cash += o.advance; post(s, `advance:${act.id}`, -o.advance, 'advances', `Luvas de empresário ${act.name}`); }
  act.trust = clamp(act.trust + 6, 0, 100);
  const k = s.knowledge[act.id];
  if (k) k.stage = 'monitoring';
  const lb = act.owner && s.labels[act.owner] ? s.labels[act.owner].name : null;
  notify(s, fmtL(l('{a} assinou com você como empresário ({p}% de comissão){b}.', '{a} signed you as manager ({p}% commission){b}.'), { a: act.name, p: Math.round(rate * 100), b: lb ? fmtL(l(' — continua em {l}', ' — stays with {l}'), { l: lb }) : '' }), 'good');
  remember(s, 'manager9', fmtL(l('Você passa a empresariar {a} ({p}% de comissão, contrato de {m} meses).', 'You start managing {a} ({p}% commission, {m}-month contract).'), { a: act.name, p: Math.round(rate * 100), m: o.termMonths }), { actId: act.id, important: true });
  return true;
};

/** Produção e JV: completam o contrato normal que acceptOffer acabou de criar. */
special29().signed = (s, act, o, c) => {
  if (o.model === 'production') {
    c.x29 = { ...(c.x29 ?? {}), deliveries: [], paid: 0, artistPaid: 0 };
    if (!careers(s).active.includes('studio')) startCareer(s, 'studio'); // a produtora é a carreira de estúdio/produtor
    return;
  }
  if (o.model !== 'jv') return;
  const share = shareOf29(o);
  const r = Rng.fromSeed(`${s.config.seed}|jv29|${c.id}`);
  const sl: SubLabel = {
    id: nextId(s, 'sub'), name: `${act.name} Records`, logoSeed: r.int(1, 2 ** 30), genreFocus: act.genre, cash: 0, reserve: money(s, 1000), budget: money(s, 2500),
    strategy: 'catalog', roster: [act.id], managerSalary: money(s, 400), founderShare: Math.round((1 - share) * 100) / 100,
    board: [{ name: act.name, share, goal: 'culture' }], loans: [], creditors: [], status: 'active', distressMonths: 0,
    retained: 0, revenueYear: 0, revenueLastYear: 0, log: [], history: [], founded: s.year,
  };
  for (const o2 of s.subLabels) o2.roster = o2.roster.filter((x) => x !== act.id);
  // o adiantamento não vai para o bolso do artista: vira o capital do selo da sociedade
  if (o.advance > 0) {
    act.cash -= o.advance;
    post(s, `jv29adv:${c.id}`, o.advance, 'advances', `Adiantamento de ${act.name} convertido em capital da JV`);
    post(s, `jv29cap:${c.id}`, -o.advance, 'transfers', `Capital da JV ${sl.name}`);
    sl.cash += o.advance;
    sl.log.push({ week: s.week, amount: o.advance, memo: 'Capital da joint venture' });
  }
  sl.history.push({ week: s.week, text: fmtL(l('Joint venture fundada: {c} {p}% · {a} {q}%.', 'Joint venture founded: {c} {p}% · {a} {q}%.'), { c: s.config.companyName, p: Math.round(sl.founderShare * 100), a: act.name, q: Math.round(share * 100) }) });
  s.subLabels.push(sl);
  c.recoupBalance = 0; // capital do selo não é adiantamento recuperável
  c.x29 = { artistShare: share, target: targetOf29(o), subId: sl.id, paid: 0, artistPaid: 0 };
  remember(s, 'sublabel', fmtL(l('{c} e {a} fundam a joint venture {n}.', '{c} and {a} found the joint venture {n}.'), { c: s.config.companyName, a: act.name, n: sl.name }), { actId: act.id, important: true });
};

// ---------------------------------------------------------------- encerramento comum

function end29(s: GameState, c: Contract, why: End29): void {
  const x = (c.x29 ??= {});
  if (x.ended) return;
  x.ended = why;
  x.endWeek29 = s.week;
  c.endWeek = Math.min(c.endWeek, s.week);
  const act = s.acts[c.actId];
  if (c.model === 'management' && clientOf(s, c.actId)) dropClient(s, c.actId);
  const name = act?.name ?? '?';
  notify(s, fmtL(l('Acordo de {m} com {a} encerrado: {w}.', '{m} deal with {a} ended: {w}.'), { m: MODEL_L[c.model] ?? l(c.model), a: name, w: END29_NAME[why] }), why === 'expired' || why === 'buyout' ? 'info' : 'bad');
}
const MODEL_L: Record<string, L> = { management: l('empresariamento', 'management'), production: l('produção', 'production'), jv: l('joint venture', 'joint venture') };

// ---------------------------------------------------------------- empresariamento

/** Você deixa a gestão (antes do prazo: o artista se sente largado e a reputação de empresário sofre). */
export function quitManagement29(s: GameState, cid: string): L | null {
  const c = s.contracts[cid];
  if (!c || c.model !== 'management' || c.x29?.ended) return l('Contrato inválido.', 'Invalid contract.');
  const act = s.acts[c.actId];
  const early = c.endWeek - s.week > 4;
  if (act) act.trust = clamp(act.trust - (early ? 8 : 2), 0, 100);
  if (early) MGR(s).rep = clamp(MGR(s).rep - 2, 0, 100);
  end29(s, c, 'quit');
  return null;
}

function monthMgmt(s: GameState, c: Contract, act: Act | undefined): void {
  const x = (c.x29 ??= {});
  if (!activeAct(act)) return end29(s, c, 'gone');
  const cl = clientOf(s, act.id);
  if (!cl) return end29(s, c, MGR(s).fired.some((f) => f.actId === act.id && f.y >= s.year - 1) ? 'fired' : 'quit');
  x.commission = cl.rate; // renegociar a comissão (manager11) muda o contrato
  x.paid = cl.earned;
  // conflito de interesse: o ato veio para o seu selo
  if (act.owner === 'player' && !act.playerBand) {
    act.trust = clamp(act.trust - 2, 0, 100);
    cl.sat = clamp(cl.sat - 3, 0, 100);
    if (!x.conflict) {
      x.conflict = true;
      notify(s, fmtL(l('Conflito de interesse: você é empresário E selo de {a}. A confiança cai todo mês até um dos dois acabar.', 'Conflict of interest: you are both manager AND label of {a}. Trust drops every month until one of them ends.'), { a: act.name }), 'bad');
    }
  }
  if (c.endWeek <= s.week) end29(s, c, 'expired');
}

// ---------------------------------------------------------------- produção

/** Proposta de um selo pelos masters gravados e ainda não lançados (sem efeito). */
export function deliveryQuote29(s: GameState, cid: string, lbId: string, kind: Delivery29['kind']): { n: number; adv: number; pts: number; type: Release['type'] } | null {
  const c = s.contracts[cid];
  const act = c ? s.acts[c.actId] : undefined;
  const lb = s.labels[lbId];
  if (!c || !act || !lb) return null;
  const songs = unreleasedRecorded(s, act).slice(0, 10);
  if (!songs.length) return null;
  const q = songs.reduce((t, x) => t + (x.q ?? 50), 0) / songs.length;
  const per = money(s, 250 + act.fame * 45 + q * 8) * (0.7 + lb.reputation / 200);
  const adv = Math.round(per * songs.length / 100) * 100;
  const type: Release['type'] = songs.length >= 8 ? 'lp' : songs.length >= 3 ? 'ep' : 'single';
  return kind === 'sale' ? { n: songs.length, adv: Math.round(adv * 2.2 / 100) * 100, pts: 0, type } : { n: songs.length, adv, pts: PROD_PTS29 + (act.fame > 30 ? 0.02 : 0), type };
}

/** Selos que podem receber os masters agora (ativos e com caixa para o adiantamento). */
export function deliveryLabels29(s: GameState, cid: string): { id: string; name: string; adv: number }[] {
  return Object.values(s.labels).filter((lb) => lb.active).map((lb) => ({ id: lb.id, name: lb.name, adv: deliveryQuote29(s, cid, lb.id, 'license')?.adv ?? 0 }))
    .filter((x) => x.adv > 0 && (s.labels[x.id]?.cash ?? 0) >= x.adv).sort((a, b) => b.adv - a.adv || (a.id < b.id ? -1 : 1)).slice(0, 6);
}

/** Dinheiro que chega à produtora: entra no caixa e a parte do artista sai (abatendo o adiantamento dele). */
function payProd(s: GameState, c: Contract, act: Act, amount: number, key: string, memo: string): void {
  if (amount <= 0) return;
  const x = (c.x29 ??= {});
  if (!post(s, key, amount, 'production', memo)) return;
  x.paid = (x.paid ?? 0) + amount;
  const part = Math.round(amount * clamp(c.royalty, 0, 0.9));
  const rec = Math.min(Math.max(0, c.recoupBalance), part);
  if (rec > 0) { c.recoupBalance -= rec; c.recouped = (c.recouped ?? 0) + rec; }
  const pay = part - rec;
  if (pay > 0) {
    post(s, `${key}:art`, -pay, 'royalties', `Parte de ${act.name} (contrato de produção)`);
    act.cash += pay;
    x.artistPaid = (x.artistPaid ?? 0) + pay;
  }
}

/** Entrega os masters gravados (até 10 faixas) a um selo rival: licença (adiantamento + pontos) ou venda. */
export function deliverMasters29(s: GameState, cid: string, lbId: string, kind: Delivery29['kind'] = 'license'): L | null {
  const c = s.contracts[cid];
  const act = c ? s.acts[c.actId] : undefined;
  if (!c || c.model !== 'production' || !act || act.contractId !== c.id || c.x29?.ended) return l('Contrato de produção inválido.', 'Invalid production deal.');
  const lb = s.labels[lbId];
  if (!lb?.active) return l('Selo inválido.', 'Invalid label.');
  const qt = deliveryQuote29(s, cid, lbId, kind);
  if (!qt) return l('Nada gravado esperando lançamento: grave antes de entregar masters.', 'Nothing recorded awaiting release: record before delivering masters.');
  if (lb.cash < qt.adv) return fmtL(l('{l} não tem caixa para pagar {v}.', '{l} lacks the cash to pay {v}.'), { l: lb.name, v: usd(qt.adv) });
  const x = (c.x29 ??= {});
  const list = (x.deliveries ??= []);
  const songs = unreleasedRecorded(s, act).slice(0, 10).map((so) => so.id);
  const r = Rng.fromSeed(`${s.config.seed}|prod29|${c.id}|${list.length}`);
  const rel = launchNpcRelease(s, r, act, lbId, songs, qt.type, 1200 + lb.reputation * 25);
  lb.cash -= qt.adv;
  const d: Delivery29 = { relId: rel.id, lb: lbId, kind, adv: qt.adv, pts: qt.pts, earned: 0, paid: 0, week: s.week };
  list.push(d);
  payProd(s, c, act, qt.adv, `prod29adv:${rel.id}`, `${kind === 'sale' ? 'Venda' : 'Adiantamento'} de ${lb.name} por "${rel.title}"`);
  notify(s, fmtL(kind === 'sale' ? l('Masters de "{t}" ({a}) vendidos a {l} por {v}.', 'Masters of "{t}" ({a}) sold to {l} for {v}.') : l('Masters de "{t}" ({a}) licenciados a {l}: {v} de adiantamento e {p}% de pontos.', 'Masters of "{t}" ({a}) licensed to {l}: {v} advance and {p}% points.'), { t: rel.title, a: act.name, l: lb.name, v: usd(qt.adv), p: Math.round(qt.pts * 100) }), 'good');
  remember(s, 'signed', fmtL(l('A produtora de {c} entrega "{t}" de {a} para {l}.', '{c}\'s production company delivers "{t}" by {a} to {l}.'), { c: s.config.companyName, t: rel.title, a: act.name, l: lb.name }), { actId: act.id });
  return null;
}

/** Libera o artista do contrato de produção antes do prazo (as entregas já feitas continuam pagando pontos). */
export function releaseProduction29(s: GameState, cid: string): L | null {
  const c = s.contracts[cid];
  const act = c ? s.acts[c.actId] : undefined;
  if (!c || c.model !== 'production' || !act || c.x29?.ended) return l('Contrato inválido.', 'Invalid contract.');
  if (act.contractId === c.id) endContract(s, act, 'terminated');
  act.trust = clamp(act.trust + 4, 0, 100);
  end29(s, c, 'released');
  return null;
}

function findDelivery(s: GameState, relId: string): { c: Contract; d: Delivery29 } | null {
  for (const id in s.contracts) {
    const c = s.contracts[id];
    if (c.model !== 'production' || c.party !== 'player') continue;
    const d = c.x29?.deliveries?.find((x) => x.relId === relId);
    if (d) return { c, d };
  }
  return null;
}

// disco entregue: o selo fica com o master (e a receita), a produtora recebe pontos depois de recuperar o adiantamento
prod29().dist = (s, rel, act, gross, units) => {
  const hit = findDelivery(s, rel.id);
  if (!hit) return false;
  const { c, d } = hit;
  const lb = s.labels[d.lb];
  const pts = d.kind === 'sale' ? 0 : Math.round(gross * d.pts);
  const labelGets = gross - pts;
  if (lb) { lb.cash += labelGets; lb.revenueYear += gross; }
  rel.revenue += labelGets;
  if (pts > 0) {
    d.earned += pts;
    const due = Math.max(0, d.earned - d.adv) - d.paid;
    if (due > 0) { d.paid += due; payProd(s, c, act, due, `prod29pts:${rel.id}`, `Pontos de produção "${rel.title}" (${lb?.name ?? '?'})`); }
  }
  // edição e fãs como num disco de selo rival
  act.cash += Math.round(gross * 0.05);
  act.fans.casual += Math.round(units * 0.1);
  act.fans.active += Math.round(units * 0.006);
  return true;
};

function monthProd(s: GameState, c: Contract, act: Act | undefined): void {
  if (!act) return end29(s, c, 'gone');
  if (act.contractId !== c.id) end29(s, c, c.endWeek <= s.week ? 'expired' : 'released');
}

// ---------------------------------------------------------------- joint venture

export const jvSub29 = (s: GameState, c: Contract): SubLabel | undefined => (c.x29?.subId ? s.subLabels.find((x) => x.id === c.x29!.subId) : undefined);
const stakeOf = (sl: SubLabel, act: Act | undefined): number => (act ? sl.board.find((b) => b.name === act.name)?.share ?? 0 : 0);

/** Lançamentos que contam para a meta: do subselo (atos do elenco da JV) e do ato da JV pelo seu selo, desde a assinatura. */
export function jvReleases29(s: GameState, c: Contract): number {
  const sl = jvSub29(s, c);
  const ids = new Set([c.actId, ...(sl?.roster ?? [])]);
  let n = 0;
  for (const aid of ids) for (const rid of s.acts[aid]?.releases ?? []) {
    const r = s.releases[rid];
    if (r && r.week >= c.startWeek && (r.owner === sl?.id || (aid === c.actId && r.owner === 'player'))) n++;
  }
  return n;
}
export const jvTargetMet29 = (s: GameState, c: Contract): boolean => jvReleases29(s, c) >= (c.x29?.target ?? 0);
/** Multa por dissolver/encerrar sem cumprir a meta (vai para o artista). */
export const jvPenalty29 = (s: GameState, c: Contract): number => Math.max(money(s, 1000), Math.round(c.advance * 0.25 / 100) * 100);

function slMove(sl: SubLabel, week: number, amount: number, memo: string): void {
  sl.cash += amount;
  sl.log.push({ week, amount, memo });
  if (sl.log.length > 80) sl.log.splice(0, sl.log.length - 80);
}

/** Divisão anual do lucro distribuível (acima da reserva, até o lucro retido) pela participação de cada sócio. */
export function splitJV29(s: GameState, c: Contract): number {
  const sl = jvSub29(s, c);
  const act = s.acts[c.actId];
  if (!sl || !act || (sl.status !== 'active' && sl.status !== 'distress')) return 0;
  const dist = Math.max(0, Math.min(sl.retained, sl.cash - sl.reserve));
  if (dist < money(s, 50)) return 0;
  slMove(sl, s.week, -dist, 'Divisão do lucro da JV');
  sl.retained -= dist;
  const mine = Math.round(dist * sl.founderShare);
  const theirs = Math.round(dist * stakeOf(sl, act));
  post(s, `jv29div:${c.id}:${s.year}`, mine, 'dividends', `Lucro da JV ${sl.name}`);
  act.cash += theirs;
  const x = (c.x29 ??= {});
  x.paid = (x.paid ?? 0) + mine;
  x.artistPaid = (x.artistPaid ?? 0) + theirs;
  sl.history.push({ week: s.week, text: fmtL(l('Lucro dividido: {v} ({c} {p}, {a} {q}).', 'Profit split: {v} ({c} {p}, {a} {q}).'), { v: usd(dist), c: s.config.companyName, p: usd(mine), a: act.name, q: usd(theirs) }) });
  return dist;
}

/** Fecha o selo da sociedade: o caixa é dividido pela participação; dívida, a sua parte cobre. */
function closeJV(s: GameState, c: Contract, act: Act | undefined, penalty: boolean): void {
  const sl = jvSub29(s, c);
  if (!sl || sl.status === 'closed') return;
  const debt = sl.loans.reduce((t, x) => t + x.balance, 0) + sl.creditors.reduce((t, x) => t + x.owed, 0) - Math.min(0, sl.cash);
  if (sl.cash > 0) {
    const mine = Math.round(sl.cash * sl.founderShare);
    const theirs = Math.round(sl.cash * stakeOf(sl, act));
    if (mine) post(s, `jv29close:${c.id}`, mine, 'transfers', `Saldo da JV ${sl.name}`);
    if (act) act.cash += theirs;
    const x = (c.x29 ??= {});
    x.artistPaid = (x.artistPaid ?? 0) + theirs;
  }
  if (debt > 0) post(s, `jv29debt:${c.id}`, -debt, 'transfers', `Dívidas da JV ${sl.name}`);
  if (penalty && act) {
    const pen = jvPenalty29(s, c);
    post(s, `jv29pen:${c.id}`, -pen, 'legal', `Multa da JV (meta não cumprida) ${act.name}`);
    act.cash += pen;
    act.trust = clamp(act.trust - 10, 0, 100);
  }
  sl.cash = 0; sl.loans = []; sl.creditors = []; sl.roster = []; sl.status = 'closed';
  sl.history.push({ week: s.week, text: l('Joint venture encerrada; elenco volta à matriz.', 'Joint venture closed; roster returns to the parent.') });
}

/** Compra a participação do artista (valor do selo × participação × 1,15): o selo vira 100% seu; o contrato segue. */
export function buyoutJV29(s: GameState, cid: string): L | null {
  const c = s.contracts[cid];
  const act = c ? s.acts[c.actId] : undefined;
  const sl = c ? jvSub29(s, c) : undefined;
  if (!c || c.model !== 'jv' || !act || !sl || c.x29?.ended || c.x29?.bought !== undefined || sl.status === 'closed' || sl.status === 'bankrupt') return l('Joint venture inválida.', 'Invalid joint venture.');
  const share = stakeOf(sl, act);
  if (share <= 0) return l('O artista não tem mais participação.', 'The act no longer holds a stake.');
  const price = buyoutPrice29(s, c);
  if (freeCash20(s) < price) return cashWhy20(s, price, l('Caixa insuficiente para comprar a parte do artista.', 'Not enough cash to buy out the act.'));
  post(s, `jv29buy:${c.id}`, -price, 'transfers', `Compra da parte de ${act.name} na JV ${sl.name}`);
  act.cash += price;
  sl.board = sl.board.filter((b) => b.name !== act.name);
  sl.founderShare = Math.round((sl.founderShare + share) * 100) / 100;
  (c.x29 ??= {}).bought = s.week;
  c.x29.artistPaid = (c.x29.artistPaid ?? 0) + price;
  sl.history.push({ week: s.week, text: fmtL(l('{c} compra a parte de {a} ({v}).', '{c} buys out {a} ({v}).'), { c: s.config.companyName, a: act.name, v: usd(price) }) });
  notify(s, fmtL(l('Você comprou a parte de {a} na JV {n} por {v}: o selo é todo seu.', 'You bought {a}\'s stake in the JV {n} for {v}: the label is all yours.'), { a: act.name, n: sl.name, v: usd(price) }), 'good');
  return null;
}
export function buyoutPrice29(s: GameState, c: Contract): number {
  const sl = jvSub29(s, c);
  const act = s.acts[c.actId];
  return sl ? Math.round(subLabelValuation(s, sl) * stakeOf(sl, act) * 1.15 / 100) * 100 : 0;
}

/** Dissolve a JV antes do prazo: divide o caixa, multa se a meta não estiver cumprida, e o ato deixa o selo. */
export function dissolveJV29(s: GameState, cid: string): L | null {
  const c = s.contracts[cid];
  const act = c ? s.acts[c.actId] : undefined;
  if (!c || c.model !== 'jv' || c.x29?.ended) return l('Joint venture inválida.', 'Invalid joint venture.');
  const bought = c.x29?.bought !== undefined;
  closeJV(s, c, act, !bought && !jvTargetMet29(s, c));
  if (act && act.contractId === c.id) endContract(s, act, 'terminated');
  end29(s, c, 'dissolved');
  return null;
}

function monthJV(s: GameState, c: Contract, act: Act | undefined): void {
  const sl = jvSub29(s, c);
  if (!sl || sl.status === 'closed' || sl.status === 'bankrupt') return end29(s, c, act ? 'dissolved' : 'gone');
  const bought = c.x29?.bought !== undefined;
  if (!act) { closeJV(s, c, act, false); return end29(s, c, 'gone'); }
  // o artista sai da sociedade quando a confiança desaba
  if (!bought && act.trust < 20) {
    closeJV(s, c, act, false);
    if (act.contractId === c.id) endContract(s, act, 'left');
    return end29(s, c, 'partner_exit');
  }
  if (s.month === 11 && !bought) splitJV29(s, c);
  // fim do prazo (ou o ato saiu do selo): a sociedade se desfaz — meta cumprida agrada; não cumprida, multa
  if (c.endWeek <= s.week || act.contractId !== c.id) {
    const met = jvTargetMet29(s, c);
    if (!bought) {
      if (s.month !== 11) splitJV29(s, c);
      closeJV(s, c, act, !met);
      if (met) act.trust = clamp(act.trust + 8, 0, 100);
    }
    end29(s, c, 'expired');
  }
}

// ---------------------------------------------------------------- mês

registerSimHook('month', 'contracts29', (s) => {
  for (const id in s.contracts) {
    const c = s.contracts[id];
    if (c.party !== 'player' || !isSpecial29(c.model) || c.x29?.ended) continue;
    const act = s.acts[c.actId];
    if (c.model === 'management') monthMgmt(s, c, act);
    else if (c.model === 'production') monthProd(s, c, act);
    else monthJV(s, c, act);
  }
});

// ---------------------------------------------------------------- leitura para as telas

export interface Row29 { c: Contract; act?: Act; active: boolean; status: L; flows: L; terms: L }
/** Todos os acordos especiais do jogador (vigentes primeiro). */
export function specialDeals29(s: GameState): Row29[] {
  const out: Row29[] = [];
  for (const c of Object.values(s.contracts)) {
    if (c.party !== 'player' || !isSpecial29(c.model)) continue;
    const act = s.acts[c.actId];
    const active = active29(s, c);
    const x = c.x29 ?? {};
    const status = x.ended ? fmtL(l('encerrado: {w}', 'ended: {w}'), { w: END29_NAME[x.ended] }) : active ? fmtL(l('vigente · {n} sem. restantes', 'active · {n} wk left'), { n: Math.max(0, c.endWeek - s.week) }) : l('encerrado', 'ended');
    let terms: L, flows: L;
    if (c.model === 'management') {
      const lb = act?.owner && act.owner !== 'player' ? s.labels[act.owner]?.name : null;
      terms = fmtL(l('{p}% de comissão · {l}', '{p}% commission · {l}'), { p: Math.round((x.commission ?? 0) * 100), l: lb ? fmtL(l('ato em {n}', 'act at {n}'), { n: lb }) : l('ato sem selo', 'act without a label') });
      flows = fmtL(l('comissões recebidas: {v}', 'commissions received: {v}'), { v: usd(x.paid ?? 0) });
    } else if (c.model === 'production') {
      const ds = x.deliveries ?? [];
      terms = fmtL(l('{p}% dos recebimentos para o artista · {n} entrega(s)', '{p}% of receipts to the act · {n} delivery(ies)'), { p: Math.round(c.royalty * 100), n: ds.length });
      flows = fmtL(l('produtora recebeu {v} · artista {a}', 'company received {v} · act {a}'), { v: usd(x.paid ?? 0), a: usd(x.artistPaid ?? 0) });
    } else {
      const sl = jvSub29(s, c);
      terms = fmtL(l('{n}: {c} {p}% · artista {q}% · meta {m}/{t}', '{n}: {c} {p}% · act {q}% · target {m}/{t}'), { n: sl?.name ?? '?', c: s.config.companyName, p: Math.round((sl?.founderShare ?? 0) * 100), q: Math.round((sl && act ? stakeOf(sl, act) : 0) * 100), m: jvReleases29(s, c), t: x.target ?? 0 });
      flows = fmtL(l('lucro para você {v} · para o artista {a}', 'profit to you {v} · to the act {a}'), { v: usd(x.paid ?? 0), a: usd(x.artistPaid ?? 0) });
    }
    out.push({ c, act, active, status, flows, terms });
  }
  return out.sort((a, b) => Number(b.active) - Number(a.active) || b.c.startWeek - a.c.startWeek);
}
