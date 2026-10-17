// R33 · QA33 — LIGAÇÕES ENTRE AS FRENTES. Cada frente da 33 deixou ganchos para as outras (docs/r33/*.md, "Ganchos");
// aqui eles são ligados de verdade. Cada ligação só vale com os interruptores das DUAS pontas ligados; com eles
// desligados todos os ganchos devolvem "não tratei" (null/1/false) e o jogo é o de antes (mesmo save, mesmos goldens).
//  • hospital (INT-2) → saúde/estresse do dono (VIDA): consulta com o efeito da VIDA e internação de descanso;
//  • banco (INT-2) → crise de crédito (MUNDO) em todo empréstimo e relíquias como garantia (CATÁLOGO), com execução
//    da garantia quando o selo fica no vermelho;
//  • cartório/tribunal (INT-2) → processos de sampling/regravação (CATÁLOGO), também pelo diretor jurídico (GESTÃO);
//  • estúdio de TV e agência de publicidade (INT-2) → catálogo que reaparece (CATÁLOGO);
//  • homenagem póstuma (PESSOAS) → catálogo que reaparece (CATÁLOGO);
//  • tipos da INT-2 → lotes da MAPA33 (pedido do lote quando o prédio existe na cidade e na época);
//  • aprendizados (GESTÃO) → largura da faixa da previsão de vendas (mercado);
//  • robô (GESTÃO) → sampling, hospital, cartório, loja própria e rotina do dono.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { oldRel19 } from '../sys/revival19';
import { LOTS18 } from '../sys/campus18';
import { ownsLot31 } from '../sys/lots31';
import { ownerOf } from '../sys/people/owner';
import { releasesNow27 } from '../tickcache27';
import type { GameState } from '../types';
import { fmtL, money, nextId, post } from '../util';
import { registerBot33 } from './bots33';
import { FCW33, LOAN_X33 } from './hooks33';
import { on33, peek33 } from './cat33';
import { openShop33, shopLock33 } from './cidade33';
import { registerLegalCase33 } from './dir33';
import { INT2, INT2_BLOCK, INT2_HOOKS, INT2_NOW, INT2_WHEN, int2Acts, int2Do, int2Exists, int2On, type Int2Id, type Int2Res } from './int2';
import { learnWidth33 } from './learn33';
import { mapaOn33, setWant33 } from './mapa33';
import { creditCrisis33, crise33On, memes33On } from './mundo33';
import { setCatalogSurge33 } from './pessoas33';
import { collateral33, pledge33, seize33, unpledge33 } from './relic33';
import { resurface33, resurfaced33, tribute33 } from './resurf33';
import { caseOdds33, openCases33, openReqs33, answerReq33, resolveCase33 } from './sample33';
import { SW33 as VIDA33, setRoutine33, treatOwner33, vida33 } from './vida33';
import { sw } from '../r31/switches';

const ok = (text: L): Int2Res => ({ ok: true, text });
const no = (text: L): Int2Res => ({ ok: false, text });
const vidaOn = (s: GameState, k: keyof typeof VIDA33): boolean => !!sw<boolean>(s, VIDA33[k]);
const creditOn = (s: GameState): boolean => crise33On(s) || memes33On(s);
const pct = (x: number): number => Math.round(x * 100);

// ================================================================ hospital (INT-2) → VIDA

INT2_HOOKS['hospital.checkup'] = (s) => {
  if (!vidaOn(s, 'saude')) return null;
  const e = treatOwner33(s, 'checkup', true);
  return e ? no(e) : ok(l('Consulta feita: saúde +8 e estresse −8.', 'Check-up done: health +8 and stress −8.'));
};
INT2_WHEN['hospital.retiro'] = (s) => vidaOn(s, 'saude');
INT2_HOOKS['hospital.retiro'] = (s) => {
  const e = treatOwner33(s, 'rehab', true);
  return e ? no(e) : ok(l('Você se interna para descansar: saúde +20, estresse −30 e dois meses longe do escritório.', 'You check in to rest: health +20, stress −30 and two months away from the office.'));
};

// ================================================================ banco (INT-2) → crédito (MUNDO) e garantia (CATÁLOGO)

/** Todo empréstimo do jogo (livro-caixa e banco) sente a crise: juros a mais, limite menor, congelado no começo das crises. */
LOAN_X33.f = (s, o) => {
  if (!creditOn(s)) return o;
  const c = creditCrisis33(s);
  if (!c.active) return o;
  if (c.freeze) return null;
  return { amount: Math.round(o.amount * c.limitMult), rate: clamp(o.rate + c.rateAdd, 0.04, 0.35), months: o.months };
};

const BANK33 = 'bank:';
/** Crédito com garantia: a melhor relíquia empenhável (CATÁLOGO) ou o catálogo de músicas; a crise corta o valor. */
INT2_HOOKS['bank.collateral'] = (s, key) => {
  const relicsOn = on33(s, 'exp33.relics'), c = creditOn(s) ? creditCrisis33(s) : null;
  if (!relicsOn && !c?.active) return null; // o crédito pequeno da INT-2, como antes
  if (c?.freeze) return no(l('Crise de crédito: o banco congelou os empréstimos por enquanto.', 'Credit crunch: the bank has frozen lending for now.'));
  const top = relicsOn ? collateral33(s)[0] : undefined;
  const base = top ? Math.max(top.v, money(s, 2000)) : money(s, 6000);
  const amount = Math.round(base * (1 - (c?.haircut ?? 0)));
  const rate = clamp((top ? 0.09 : 0.1) + (s.economy.recession ? 0.04 : 0) + (c?.rateAdd ?? 0), 0.04, 0.35), months = 12;
  const monthly = Math.round((amount * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -months)));
  const id = nextId(s, 'ln');
  s.player.loans.push({ id, principal: amount, balance: amount, rate, monthly, startWeek: s.week });
  post(s, `${key}:in`, amount, 'financing', top ? 'Crédito com relíquia em garantia' : 'Crédito com garantia do catálogo');
  if (top) pledge33(s, top.rid, `${BANK33}${id}`);
  return ok(top
    ? fmtL(l('O banco aceitou "{n}" como garantia: {r}% ao ano em 12 meses. Se o selo ficar no vermelho, a peça vai a leilão.', 'The bank took "{n}" as collateral: {r}% a year over 12 months. If the label goes into the red, the piece goes to auction.'), { n: top.n, r: pct(rate) })
    : fmtL(l('O banco aceitou o catálogo como garantia: {r}% ao ano em 12 meses.', 'The bank took the catalogue as collateral: {r}% a year over 12 months.'), { r: pct(rate) }));
};
INT2_NOW.bank = (s) => {
  const c = creditOn(s) ? creditCrisis33(s) : null;
  if (c?.active) return c.freeze ? l('Crise de crédito: empréstimos congelados.', 'Credit crunch: lending frozen.')
    : fmtL(l('Crise de crédito: juros +{r} pontos, limite {m}% do normal, garantia vale {h}% menos.', 'Credit crunch: rates +{r} points, limit {m}% of normal, collateral worth {h}% less.'), { r: pct(c.rateAdd), m: pct(c.limitMult), h: pct(c.haircut) });
  if (on33(s, 'exp33.relics')) { const n = collateral33(s).length; if (n) return fmtL(l('O banco aceita {n} peça(s) do seu acervo como garantia.', 'The bank accepts {n} piece(s) of your collection as collateral.'), { n }); }
  return null;
};
/** Garantia solta quando o empréstimo acaba; executada quando o selo passa 2+ meses no vermelho (abate a dívida). */
registerSimHook('month', 'ligar33.pledge', (s) => {
  const st = peek33(s);
  if (!st || !on33(s, 'exp33.relics')) return;
  for (const [rid, p] of Object.entries(st.pledge)) {
    if (!p.to.startsWith(BANK33)) continue;
    const loan = s.player.loans.find((x) => x.id === p.to.slice(BANK33.length));
    if (!loan) { unpledge33(s, rid); continue; }
    if (s.player.insolvencyMonths < 2) continue;
    const v = seize33(s, rid, 'O banco');
    loan.balance = Math.max(0, loan.balance - v);
  }
  s.player.loans = s.player.loans.filter((x) => x.balance > 0);
});

// ================================================================ cartório/tribunal (INT-2) → processos (CATÁLOGO) e jurídico (GESTÃO)

const sampOn = (s: GameState): boolean => on33(s, 'exp33.sampling');
const oldestCase = (s: GameState) => [...openCases33(s)].sort((a, b) => a.since - b.since || (a.id < b.id ? -1 : 1))[0];
const noCase = (s: GameState): L | null => (oldestCase(s) ? null : l('Nenhum processo aberto.', 'No open case.'));
for (const [k, how] of [['court.processo', 'court'], ['court.acordo', 'settle']] as const) {
  INT2_WHEN[k] = sampOn;
  INT2_BLOCK[k] = noCase;
  INT2_HOOKS[k] = (s) => { const c = oldestCase(s); return c ? ok(resolveCase33(s, c.id, how)) : no(l('Nenhum processo aberto.', 'No open case.')); };
}
INT2_NOW.court = (s) => {
  if (!sampOn(s)) return null;
  const n = openCases33(s).length, q = openReqs33(s).length;
  return n || q ? fmtL(l('{n} processo(s) aberto(s), {q} pedido(s) de liberação esperando resposta.', '{n} open case(s), {q} clearance request(s) awaiting an answer.'), { n, q }) : null;
};
registerLegalCase33({
  id: 'sample33',
  list: (s) => (sampOn(s) ? openCases33(s).map((c) => ({ id: c.id, t: fmtL(l('processo por "{t}"', 'lawsuit over "{t}"'), { t: s.songs[c.song]?.title ?? '?' }), settle: 1, win: caseOdds33(s) })) : []),
  decide: (s, id, how) => { resolveCase33(s, id, how === 'fight' ? 'court' : 'settle'); return null; },
});

// ================================================================ TV e publicidade (INT-2) → catálogo que reaparece (CATÁLOGO)

function resurfHook(k: 'film' | 'tv_ad'): (s: GameState) => Int2Res | null {
  return (s) => {
    if (!on33(s, 'exp33.resurface')) return null;
    const recent = new Set(resurfaced33(s, 52).map((x) => x.rel));
    const rel = releasesNow27(s).filter((x) => x.owner === 'player' && oldRel19(s, x) && !recent.has(x.id)).sort((a, b) => b.totalUnits - a.totalUnits || (a.id < b.id ? -1 : 1))[0];
    if (!rel) return null; // sem catálogo antigo: o cachê simples da INT-2
    const x = resurface33(s, rel, k);
    return x ? ok(fmtL(l('"{t}" entra em {v}: cachê de {f} e a faixa volta a ser procurada.', '"{t}" goes into {v}: a {f} fee and the track is sought again.'), { t: rel.title, v: x.name, f: `US$ ${Math.round(x.fee / 100)}` })) : null;
  };
}
INT2_HOOKS['tvstudio.trilha'] = resurfHook('film');
INT2_HOOKS['adagency.sync'] = resurfHook('tv_ad');

// ================================================================ homenagem póstuma (PESSOAS) → catálogo que reaparece

setCatalogSurge33((s, actId) => tribute33(s, actId));

// ================================================================ aprendizados (GESTÃO) → faixa da previsão

FCW33.f = (s, act, type) => learnWidth33(s, act, type);

// ================================================================ tipos da INT-2 → lotes da MAPA33

/** id da INT-2 → tipo do registro da MAPA33 (o terreno do festival não vira prédio: abre pelo objeto da cidade). */
export const SITE_OF33: Partial<Record<Int2Id, string>> = {
  bank: 'bank', court: 'court', hospital: 'hospital', stadium: 'stadium', jazz: 'jazz_club', nightclub: 'nightclub', church: 'church',
  tvstudio: 'tv_studio', adagency: 'ad_agency', samba: 'samba_school', print: 'print_shop', pirate: 'pirate_radio', station: 'train_station', port: 'harbor',
};
for (const t of INT2) {
  const kind = SITE_OF33[t.id];
  if (kind) setWant33(kind, (s) => int2On(s) && int2Exists(t, s.config.homeCity, s.year));
}
/** Prédios da INT-2 que existem agora no mapa (com `exp33.int2` e `exp33.mapa`): lote reservado de cada um. */
export function int2Sites33(s: GameState, lotFor: (kind: string) => number | undefined): { id: Int2Id; lot: number }[] {
  if (!int2On(s) || !mapaOn33(s)) return [];
  const out: { id: Int2Id; lot: number }[] = [];
  for (const t of INT2) {
    const kind = SITE_OF33[t.id];
    if (!kind || !int2Exists(t, s.config.homeCity, s.year)) continue;
    const lot = lotFor(kind);
    if (lot !== undefined) out.push({ id: t.id, lot });
  }
  return out;
}

// ================================================================ robô (GESTÃO) nas regras das outras frentes

const canDo = (s: GameState, key: string): boolean => { const [p] = key.split('.'); return int2Acts(s, p as Int2Id).some((a) => a.id === key && !a.dis); };
registerBot33({ id: 'sample33', on: sampOn, run: (s) => { const q = openReqs33(s)[0]; if (!q) return false; answerReq33(s, q.id, true); return true; } });
registerBot33({ id: 'int2.court', on: (s) => int2On(s) && sampOn(s), run: (s) => canDo(s, 'court.acordo') && int2Do(s, 'court.acordo').ok });
registerBot33({ id: 'int2.hospital', on: int2On, run: (s) => ownerOf(s).stress >= 70 && canDo(s, 'hospital.checkup') && int2Do(s, 'hospital.checkup').ok });
registerBot33({ id: 'vida33.rotina', on: (s) => vidaOn(s, 'rotina'), run: (s) => { if (vida33(s).routine) return false; setRoutine33(s, 'sleep'); return true; } });
registerBot33({
  id: 'cidade33.shop', on: (s) => !!sw<boolean>(s, 'exp33.cidade.lojas'),
  run: (s, p) => {
    if (p === 'cautious' || s.player.cash < money(s, 60000)) return false;
    for (let lot = 1; lot < LOTS18.length; lot++) if (ownsLot31(s, lot) && !shopLock33(s, lot)) return openShop33(s, lot).ok;
    return false;
  },
});
