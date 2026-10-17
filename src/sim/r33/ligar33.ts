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
import { registerMod, registerSimHook } from '../ext4';
import { FORMATS } from '../../data/rules';
import { tourList } from '../tours';
import { bookRoutedTour } from '../sys/route8';
import { oldRel19 } from '../sys/revival19';
import { LOTS18 } from '../sys/campus18';
import { ownsLot31 } from '../sys/lots31';
import { ownerOf } from '../sys/people/owner';
import { releasesNow27 } from '../tickcache27';
import type { GameState } from '../types';
import { fmtL, money, nextId, playerActs, post } from '../util';
import { registerBot33 } from './bots33';
import { FCW33, LOAN_X33 } from './hooks33';
import { on33, peek33 } from './cat33';
import { CIDADE33, openShop33, ownShops33, shopLock33 } from './cidade33';
import { registerLegalCase33 } from './dir33';
import { INT2, INT2_BLOCK, INT2_HOOKS, INT2_NOW, INT2_WHEN, int2Acts, int2Do, int2Exists, int2Now, int2On, int2What, type Int2Id, type Int2Res } from './int2';
import { INT2P27, npcName27, type Place27 } from '../sys/place27';
import { learnWidth33 } from './learn33';
import { lotFor33, mapaOn33, setWant33 } from './mapa33';
import { creditCrisis33, crise33On, exileAct33, exileCand33, memes33On } from './mundo33';
import { setCatalogSurge33 } from './pessoas33';
import { collateral33, pledge33, seize33, unpledge33 } from './relic33';
import { resurface33, resurfaced33, tribute33 } from './resurf33';
import { caseOdds33, openCases33, openReqs33, answerReq33, resolveCase33 } from './sample33';
import { SW33 as VIDA33, setRoutine33, takeTrip33, treatOwner33, tripOptions33, vida33 } from './vida33';
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
    if (p === 'cautious' || ownShops33(s) >= CIDADE33.ownMax || s.player.cash < money(s, 60000)) return false; // além do teto a loja não soma
    for (let lot = 1; lot < LOTS18.length; lot++) if (ownsLot31(s, lot) && !shopLock33(s, lot)) return openShop33(s, lot).ok;
    return false;
  },
});

// ================================================================ prédios da INT-2 como lugares do mapa (place27)

const ROLES33: Record<Int2Id, [L, L]> = {
  bank: [l('Gerente do banco', 'Bank manager'), l('Caixa', 'Teller')], court: [l('Tabelião', 'Notary'), l('Advogado', 'Lawyer')],
  hospital: [l('Médico', 'Doctor'), l('Enfermeira', 'Nurse')], stadium: [l('Administrador', 'Manager'), l('Bilheteiro', 'Box office clerk')],
  jazz: [l('Dono do clube', 'Club owner'), l('Pianista da casa', 'House pianist')], nightclub: [l('Dono da boate', 'Club owner'), l('DJ residente', 'Resident DJ')],
  church: [l('Padre', 'Priest'), l('Regente do coral', 'Choir master')], tvstudio: [l('Diretor de programa', 'Show director'), l('Câmera', 'Camera operator')],
  adagency: [l('Diretor de criação', 'Creative director'), l('Redator', 'Copywriter')], samba: [l('Presidente da escola', 'School president'), l('Mestre de bateria', 'Drum master')],
  festival: [l('Produtor', 'Producer'), l('Segurança', 'Security')], print: [l('Gráfico', 'Printer'), l('Ilustrador', 'Illustrator')],
  pirate: [l('Locutor', 'DJ'), l('Técnico', 'Engineer')], station: [l('Chefe da estação', 'Station master'), l('Carregador', 'Porter')],
  port: [l('Capitão do porto', 'Harbour master'), l('Estivador', 'Docker')],
};
INT2P27.fn = (s, fillers) => {
  const free = new Set(fillers);
  return int2Sites33(s, (k) => lotFor33(s, k)).filter((x) => free.has(x.lot)).map(({ id, lot }) => {
    const t = INT2.find((x) => x.id === id)!, owner = npcName27(s, `i2${lot}|o`), [r0, r1] = ROLES33[id];
    return { id: `pl:${lot}`, lot, k: 'int2', int2: id, name: t.name, what: int2What(id, s.year), owner, ownerK: 'npc', now: int2Now(s, id),
      people: [{ name: owner, role: r0, staff: true, job: 0 }, { name: npcName27(s, `i2${lot}|1`), role: r1, staff: true, job: 1 }], also: [], src: 'fill', draw: t.id === 'jazz' || t.id === 'nightclub' ? 'venue' : 'office' };
  });
};
INT2P27.acts = (s, id) => (int2On(s) && INT2.some((t) => t.id === id) ? int2Acts(s, id as Int2Id) : []);
INT2P27.run = (s, key) => int2Do(s, key);

/** O terreno do festival (INT-2) como lugar sem lote: abre pelo festival do mês no mapa e pelo cartão "Terreno do festival". */
export const FEST_PL33 = 'i2:fest';
export function int2FestPlace33(s: GameState): Place27 | null {
  if (!int2On(s)) return null;
  const t = INT2.find((x) => x.id === 'festival')!, owner = npcName27(s, 'i2fest|o'), [r0, r1] = ROLES33.festival;
  return { id: FEST_PL33, lot: -1, k: 'int2', int2: 'festival', name: t.name, what: int2What('festival', s.year), owner, ownerK: 'npc', now: int2Now(s, 'festival'),
    people: [{ name: owner, role: r0, staff: true, job: 0 }, { name: npcName27(s, 'i2fest|1'), role: r1, staff: true, job: 1 }], also: [], src: 'fill', draw: 'fest' };
}

// ================================================================ estádio, trem, porto e gráfica (INT-2) → turnês, MUNDO, VIDA, físico

/** Estado pequeno das ligações (só nasce quando uma ação usa): capa melhor por lançamento e frete até a semana. */
interface Lig33 { cover: Record<string, number>; freight: number; fmult: number }
const lig = (s: GameState): Lig33 => { const x = s.x4 as unknown as { lig33?: Lig33 }; return (x.lig33 ??= { cover: {}, freight: 0, fmult: 1 }); };
const peekLig = (s: GameState): Lig33 | undefined => (s.x4 as unknown as { lig33?: Lig33 }).lig33;
const physicalFmt = (f: string): boolean => !!FORMATS.find((x) => x.id === f)?.physical;
const freeAct = (s: GameState) => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split' && !a.deceased)
  .filter((a) => !tourList(s).some((t) => t.actId === a.id && (t.status === 'planned' || t.status === 'running'))).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1))[0];

/** Estádio → turnês: uma data de arena na cidade, pelo motor de turnês (bilheteria, cachê e fãs de verdade). */
INT2_HOOKS['stadium.show'] = (s) => {
  const a = freeAct(s);
  if (!a) return null; // sem artista livre: o efeito simples (reputação)
  const r = bookRoutedTour(s, a.id, [s.config.homeCity], { format: 'arena', fee: 1, split: 1, support: 1, rider: 1, intensity: 'normal', price: 1 }, 21, `Estádio — ${a.name}`);
  return 'tourId' in r ? ok(fmtL(l('{a} vai lotar o estádio daqui a 3 semanas (bilheteria e fãs pelo motor de turnês).', '{a} will play the stadium in 3 weeks (door and fans via the touring engine).'), { a: a.name })) : no(r);
};

/** Porto → MUNDO: com a censura ligada, o artista seu sob pressão do regime embarca para o exílio. */
INT2_WHEN['port.exilio'] = (s) => !!exileCand33(s);
INT2_HOOKS['port.exilio'] = (s) => {
  const id = exileCand33(s);
  if (!id) return no(l('Ninguém seu está sob pressão do regime.', 'None of yours is under regime pressure.'));
  const e = exileAct33(s, id);
  return e ? no(e) : ok(fmtL(l('{a} embarca para o exílio: volta quando o regime cair, como símbolo.', '{a} sails into exile: returns when the regime falls, as a symbol.'), { a: s.acts[id]?.name ?? '?' }));
};

/** Trem → VIDA: a viagem de trem é a viagem de lazer do mês (destino sorteado, férias curtas). */
INT2_HOOKS['station.viagem'] = (s) => {
  if (!vidaOn(s, 'rotina')) return null;
  const o = tripOptions33(s)[0];
  if (!o) return null;
  const e = takeTrip33(s, o.city, true);
  return e ? no(e) : ok(fmtL(l('Você embarca no trem para {c}: três semanas fora e menos estresse.', 'You take the train to {c}: three weeks away and less stress.'), { c: o.name }));
};

/** Trem e porto → MUNDO: frete de discos dá fôlego às vendas físicas por 8 semanas; em crise o frete rende metade. */
function freight(s: GameState, mult: number, what: L): Int2Res {
  const c = creditOn(s) ? creditCrisis33(s) : null, st = lig(s);
  st.freight = s.week + 8; st.fmult = c?.active ? 1 + (mult - 1) / 2 : mult;
  return ok(fmtL(l('{w}: vendas físicas +{p}% por 8 semanas{c}.', '{w}: physical sales +{p}% for 8 weeks{c}.'), { w: what, p: Math.round((st.fmult - 1) * 100), c: c?.active ? l(' (crise: frete caro, metade do efeito)', ' (crisis: dear freight, half the effect)') : l('', '') }));
}
INT2_HOOKS['station.bagagem'] = (s) => freight(s, 1.04, l('Discos seguem de trem para o interior', 'Records ship by rail inland'));
INT2_HOOKS['port.carga'] = (s) => freight(s, 1.06, l('Discos embarcam para fora', 'Records ship abroad'));

/** Gráfica → físico: a capa encomendada vale para o próximo lançamento seu (ou o que saiu há até 8 semanas). */
INT2_HOOKS['print.capa'] = (s) => {
  const rel = Object.values(s.releases).filter((r) => r.owner === 'player' && s.week - r.week <= 8 && r.formats.some(physicalFmt)).sort((a, b) => b.week - a.week)[0];
  const st = lig(s), key = rel ? rel.id : 'next';
  st.cover[key] = s.week + 26;
  return ok(rel ? fmtL(l('"{t}" ganha capa nova: +5% nas vendas físicas.', '"{t}" gets a new cover: +5% on physical sales.'), { t: rel.title }) : l('A capa fica pronta para o seu próximo lançamento físico (+5%).', 'The cover is ready for your next physical release (+5%).'));
};
registerMod('chartUnits', 'ligar33', (s, v, { release }) => {
  const st = peekLig(s);
  if (!st || !release || release.owner !== 'player' || !release.formats.some(physicalFmt)) return null;
  let m = 1;
  if ((st.cover[release.id] ?? 0) >= s.week) m *= 1.05;
  if (st.freight >= s.week) m *= st.fmult;
  return m === 1 ? null : { value: v * m, label: l('Capa e frete', 'Cover and freight') };
});
/** A capa "do próximo" encontra o disco quando ele sai (no gancho da semana; o modificador só lê — a previsão também passa por ele). */
registerSimHook('week', 'ligar33.cover', (s) => {
  const st = peekLig(s);
  if (!st?.cover.next) return;
  const rel = Object.values(s.releases).find((r) => r.owner === 'player' && r.week <= s.week && s.week - r.week <= 1 && r.formats.some(physicalFmt) && !st.cover[r.id]);
  if (rel) { st.cover[rel.id] = st.cover.next; delete st.cover.next; }
});
