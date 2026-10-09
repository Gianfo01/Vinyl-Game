// Rivais com estratégia reconhecível (rodada 8). Cada selo segue um "manual" derivado do arquétipo:
//  - Abutre (império): deixa os outros arriscarem e compra quem começa a subir — inclusive do jogador.
//  - Dono da cena (caçador de cenas): escolhe uma cena (cidade × gênero) e assina quem aparece nela.
//  - Catálogo (guardião): compra masters de quem está em crise e vive de relançamentos.
//  - Tecnologia (fábrica de hits): aposta cedo em formatos novos, disputa produtores e antecipa datas.
//  - Palco (boutique): turnês e relação com fãs; elenco pequeno e fiel.
// As jogadas aparecem como ações observáveis no relatório de rivais e na ficha do selo — disputar um
// produtor, antecipar um lançamento, oferecer contrato mais atraente, abandonar um mercado — para o
// jogador aprender a reconhecer e antecipar cada um.

import { clamp, type Rng } from '../../core/rng';
import { techById } from '../../data/rules';
import { cityById, familyOf, genreById, l, marketById, type L, type MarketId } from '../../data/world';
import { endContract, expectedAdvance, signWithRival } from '../contracts';
import { emitEvent, type EventDef } from '../events';
import { deferEvents, registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import { launchNpcRelease } from '../market';
import { unreleasedRecorded } from '../production';
import type { Act, GameState, Label } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { bondNote, prefsOf } from './identity8';

export type PlaybookId = 'vulture' | 'scene' | 'catalog' | 'tech' | 'live';
export type MoveKind = 'buyout' | 'buy_offer' | 'scene_sign' | 'interest' | 'catalog_buy' | 'reissue' | 'tech_bet' | 'producer' | 'date_move' | 'outbid' | 'abandon' | 'tour_push';

export interface Move { w: number; k: MoveKind; a?: string; x?: string }

export interface Rivals8State {
  log: Record<string, Move[]>;
  /** interesse declarado: ato → selo e semana */
  interest: Record<string, { lb: string; w: number }>;
  /** cena dominada por selo ("cidade:gênero") */
  scene: Record<string, string>;
  /** aposta tecnológica por selo */
  tech: Record<string, { id: string; until: number }>;
  /** lançamentos do jogador já disputados (id pendente → 1) */
  clash: Record<string, 1>;
  lastClash: number;
}

declare module '../ext4' { interface Ext4 { rivals8: Rivals8State } }
registerExt4('rivals8', () => ({ log: {}, interest: {}, scene: {}, tech: {}, clash: {}, lastClash: -999 }));
export const rivals8 = (s: GameState): Rivals8State => (s as unknown as { x4: { rivals8: Rivals8State } }).x4.rivals8;

export const PLAYBOOKS: Record<PlaybookId, { name: L; desc: L; tells: L[] }> = {
  vulture: {
    name: l('Abutre', 'Vulture'),
    desc: l('Major que deixa os outros arriscarem e compra quem começa a subir.', 'A major that lets others take the risk and buys whoever starts rising.'),
    tells: [l('Fica de olho em atos com fama subindo rápido.', 'Watches acts whose fame rises fast.'), l('Oferece comprar contratos, inclusive os seus.', 'Offers to buy contracts, including yours.'), l('Antecipa lançamentos para a semana dos seus.', 'Moves releases into the same week as yours.')],
  },
  scene: {
    name: l('Dono da cena', 'Scene owner'),
    desc: l('Selo independente que domina uma cena local e assina quem aparece nela.', 'An indie that dominates a local scene and signs whoever emerges there.'),
    tells: [l('Contrata cedo e barato na própria cena.', 'Signs early and cheap in its own scene.'), l('Artistas da cena preferem ficar com ele.', 'Scene artists prefer to stay with it.')],
  },
  catalog: {
    name: l('Guardião de catálogo', 'Catalog keeper'),
    desc: l('Aposta em catálogo e relançamentos; compra masters de quem está em crise.', 'Bets on catalog and reissues; buys masters from labels in trouble.'),
    tells: [l('Aparece quando um selo quebra.', 'Shows up when a label goes under.'), l('Relança clássicos em vez de assinar novatos.', 'Reissues classics instead of signing newcomers.')],
  },
  tech: {
    name: l('Aposta tecnológica', 'Tech bettor'),
    desc: l('Investe pesado em tecnologia e formatos novos; disputa produtores e datas.', 'Invests heavily in technology and new formats; fights for producers and dates.'),
    tells: [l('Chega primeiro em cada formato novo.', 'First into every new format.'), l('Contrata os melhores produtores do mercado.', 'Hires the best producers on the market.'), l('Antecipa lançamentos.', 'Moves release dates earlier.')],
  },
  live: {
    name: l('Palco e fãs', 'Stage and fans'),
    desc: l('Prioriza shows e relação com os fãs; elenco pequeno e fiel.', 'Prioritizes shows and fan relationships; a small, loyal roster.'),
    tells: [l('Põe o elenco na estrada.', 'Keeps its roster on the road.'), l('Os fãs dos seus artistas são fiéis.', 'Its artists have loyal fans.')],
  },
};

/** Mesmo arquétipo de rivals2.ts (sem importá-lo: evita ciclo de carga com events.ts no navegador). */
function archetypeOf(lb: Label): NonNullable<Label['archetype']> {
  if (lb.archetype) return lb.archetype;
  lb.archetype = lb.family === 'A' ? 'empire' : lb.family === 'B' ? (lb.roster.length < 5 ? 'boutique' : 'scene_hunter') : lb.family === 'C' ? 'hitmaker' : 'catalog';
  return lb.archetype;
}

export function playbookOf(lb: Label): PlaybookId {
  const ar = archetypeOf(lb);
  return ar === 'empire' ? 'vulture' : ar === 'scene_hunter' ? 'scene' : ar === 'catalog' ? 'catalog' : ar === 'hitmaker' ? 'tech' : 'live';
}

const MOVE_TXT: Record<MoveKind, L> = {
  buyout: l('comprou o contrato de {a} de {x}', 'bought {a}\'s contract from {x}'),
  buy_offer: l('ofereceu comprar o contrato de {a} (seu)', 'offered to buy {a}\'s contract (yours)'),
  scene_sign: l('assinou {a}, da cena {x}', 'signed {a}, from the {x} scene'),
  interest: l('está de olho em {a}', 'has its eye on {a}'),
  catalog_buy: l('comprou {a} masters de {x}', 'bought {a} masters from {x}'),
  reissue: l('relançou o clássico "{a}"', 'reissued the classic "{a}"'),
  tech_bet: l('aposta pesado em {x}', 'is betting heavily on {x}'),
  producer: l('contratou o produtor {a}', 'hired producer {a}'),
  date_move: l('antecipou o lançamento de {a} para a semana do seu "{x}"', 'moved {a}\'s release into the week of your "{x}"'),
  outbid: l('cobriu sua oferta e assinou {a}', 'outbid you and signed {a}'),
  abandon: l('abandonou o mercado {x}', 'abandoned the {x} market'),
  tour_push: l('pôs {a} na estrada para fidelizar fãs', 'put {a} on the road to build loyal fans'),
};

export function sceneName(key: string): string {
  const [city, genre] = key.split(':');
  return `${cityById[city]?.name ?? city} · ${genreById[genre]?.name.pt ?? genre}`;
}

function sceneNameL(key: string): L {
  const [city, genre] = key.split(':');
  const c = cityById[city]?.name ?? city;
  const g = genreById[genre]?.name ?? l(genre, genre);
  return { pt: `${c} · ${g.pt}`, en: `${c} · ${g.en}` };
}

/** Texto de uma jogada (para a ficha do selo e o relatório). */
export function moveText(m: Move): L {
  let x: L | string = m.x ?? '';
  if (m.k === 'abandon') x = marketById[m.x as MarketId]?.name ?? (m.x ?? '');
  else if (m.k === 'tech_bet') x = techById[m.x ?? '']?.name ?? (m.x ?? '');
  else if (m.k === 'scene_sign' && m.x?.includes(':')) x = sceneNameL(m.x);
  return fmtL(MOVE_TXT[m.k], { a: m.a ?? '', x });
}

function logMove(s: GameState, lb: Label, m: Omit<Move, 'w'>): void {
  const st = rivals8(s);
  const mv: Move = { w: s.week, ...m };
  const list = (st.log[lb.id] ??= []);
  list.push(mv);
  if (list.length > 8) list.splice(0, list.length - 8);
  if (s.rivalReport) {
    s.rivalReport.items.push({ labelId: lb.id, text: fmtL(l('{d}.', '{d}.'), { d: moveText(mv) }) });
    if (s.rivalReport.items.length > 20) s.rivalReport.items.splice(0, s.rivalReport.items.length - 20);
  }
  lb.lastDecision = moveText(mv);
}

// ---------------------------------------------------------------- jogadas

const free = (a: Act) => !a.owner && !a.playerBand && (a.status === 'active' || a.status === 'emerging') && !a.deceased;

function markInterest(s: GameState, lb: Label, a: Act): void {
  const st = rivals8(s);
  if (st.interest[a.id]) return;
  st.interest[a.id] = { lb: lb.id, w: s.week };
  logMove(s, lb, { k: 'interest', a: a.name });
}

function homeScene(s: GameState, lb: Label): string | undefined {
  const st = rivals8(s);
  if (st.scene[lb.id]) return st.scene[lb.id];
  const counts: Record<string, number> = {};
  for (const id of lb.roster) {
    const a = s.acts[id];
    if (a) counts[`${a.city}:${a.genre}`] = (counts[`${a.city}:${a.genre}`] ?? 0) + 1;
  }
  const best = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
  if (best) st.scene[lb.id] = best[0];
  return st.scene[lb.id];
}

function sceneTargets(s: GameState, key: string): Act[] {
  const [city, genre] = key.split(':');
  const fam = familyOf(genre);
  return Object.values(s.acts).filter((a) => free(a) && a.city === city && familyOf(a.genre) === fam);
}

function vulture(s: GameState, r: Rng, lb: Label, all: Act[]): void {
  // interesse: atos livres que começam a subir
  if (r.chance(0.05)) {
    const rising = all.filter((a) => free(a) && a.fame > 10 && a.momentum > 45).sort((x, y) => y.momentum - x.momentum)[0];
    if (rising) markInterest(s, lb, rising);
  }
  // compra o contrato de quem subiu num selo menor
  if (r.chance(0.05) && lb.cash > money(s, 400000)) {
    const target = all.filter((a) => {
      if (!a.owner || a.owner === 'player' || a.owner === lb.id || a.fame < 25 || a.momentum < 50) return false;
      const o = s.labels[a.owner];
      return !!o && o.active && (o.family === 'B' || o.family === 'D') && playbookOf(o) !== 'vulture';
    }).sort((x, y) => y.fame - x.fame)[0];
    if (target) {
      const seller = s.labels[target.owner!];
      const price = money(s, expectedAdvance(s, target) * 1.5);
      if (lb.cash > price * 2) {
        lb.cash -= price;
        seller.cash += price;
        endContract(s, target, 'terminated');
        signWithRival(s, target, lb.id, r);
        logMove(s, lb, { k: 'buyout', a: target.name, x: seller.name });
        remember(s, 'buyout8', fmtL(l('{b} compra o contrato de {a} de {c}.', '{b} buys {a}\'s contract from {c}.'), { b: lb.name, a: target.name, c: seller.name }), { actId: target.id });
      }
    }
  }
  // e de vez em quando tenta comprar um dos seus
  if (s.config.role !== 'artist' && r.chance(0.012) && lb.cash > money(s, 500000)) {
    const mine = playerActs(s).map((id) => s.acts[id]).filter((a) => a && !a.playerBand && a.fame >= 25 && a.momentum >= 45 && a.contractId && s.contracts[a.contractId]?.party === 'player');
    const a = mine.sort((x, y) => y.momentum - x.momentum)[0];
    if (a && !s.decisions.some((d) => d.eventId === 'r8_buyout')) {
      emitEvent(s, r, 'r8_buyout', { act: a.id, label: lb.id, fee: Math.round(6000 + a.fame * a.fame * 25) });
      logMove(s, lb, { k: 'buy_offer', a: a.name });
    }
  }
}

function sceneOwner(s: GameState, r: Rng, lb: Label): void {
  const key = homeScene(s, lb);
  if (!key) return;
  if (r.chance(0.06)) {
    const t0 = sceneTargets(s, key).sort((x, y) => y.fame - x.fame || y.potential - x.potential);
    if (t0[0]) markInterest(s, lb, t0[0]);
  }
  if (r.chance(0.04) && lb.roster.length < 18) {
    const a = sceneTargets(s, key).sort((x, y) => y.potential - x.potential)[0];
    if (a && lb.cash > money(s, expectedAdvance(s, a) * 1.2)) {
      signWithRival(s, a, lb.id, r);
      s.scenes[key] = (s.scenes[key] ?? 0) + 1.5;
      logMove(s, lb, { k: 'scene_sign', a: a.name, x: key });
    }
  }
}

function catalogKeeper(s: GameState, r: Rng, lb: Label): void {
  if (r.chance(0.03) && lb.cash > money(s, 300000)) {
    const sellers = Object.values(s.labels).filter((x) => x.active && x.id !== lb.id && x.cash < money(s, 150000));
    const seller = sellers.length ? r.pick(sellers) : undefined;
    if (seller) {
      const rels = Object.values(s.releases).filter((x) => x.owner === seller.id && s.year - x.year >= 5).sort((x, y) => y.totalUnits - x.totalUnits).slice(0, 6);
      if (rels.length) {
        const price = money(s, 2500 * rels.length);
        for (const x of rels) x.owner = lb.id;
        lb.cash -= price;
        seller.cash += price;
        logMove(s, lb, { k: 'catalog_buy', a: String(rels.length), x: seller.name });
      }
    }
  }
  if (r.chance(0.05)) {
    const own = Object.values(s.releases).filter((x) => x.owner === lb.id && s.year - x.year >= 15 && x.q >= 58 && !x.reissueOf);
    const rel = own.length ? r.pick(own) : undefined;
    if (rel) {
      const v = money(s, 2000 + rel.q * 40);
      lb.cash += v;
      lb.revenueYear += v;
      logMove(s, lb, { k: 'reissue', a: rel.title });
    }
  }
}

function techBettor(s: GameState, r: Rng, lb: Label): void {
  const st = rivals8(s);
  const bet = st.tech[lb.id];
  if (bet && bet.until < s.year) delete st.tech[lb.id];
  if (!st.tech[lb.id]) {
    const fresh = Object.entries(s.techDates).find(([, y]) => y === s.year || y === s.year - 1);
    if (fresh && r.chance(0.35) && lb.cash > money(s, 200000)) {
      st.tech[lb.id] = { id: fresh[0], until: s.year + 3 };
      lb.cash -= money(s, 30000);
      logMove(s, lb, { k: 'tech_bet', x: fresh[0] });
    }
  }
  if (r.chance(0.025) && lb.cash > money(s, 150000)) {
    const pro = s.professionals.filter((x) => x.role === 'producer' && x.skill >= 55).sort((x, y) => y.skill - x.skill)[0];
    if (pro) {
      s.professionals = s.professionals.filter((x) => x !== pro);
      lb.cash -= pro.salary * 12;
      logMove(s, lb, { k: 'producer', a: pro.name });
      if (s.config.role !== 'artist') notify(s, fmtL(l('{b} contratou o produtor {p} antes de você.', '{b} hired producer {p} before you could.'), { b: lb.name, p: pro.name }), 'info');
    }
  }
}

function stageAndFans(s: GameState, r: Rng, lb: Label): void {
  if (!r.chance(0.03)) return;
  const a = lb.roster.map((id) => s.acts[id]).filter((x) => x && x.status === 'active').sort((x, y) => y.fans.active - x.fans.active)[0];
  if (!a) return;
  a.fans.core += Math.round(a.fans.active * 0.012);
  a.fans.active += Math.round(a.fans.casual * 0.004);
  logMove(s, lb, { k: 'tour_push', a: a.name });
}

/** Interesse vira contrato (ou some): se o jogador tinha oferta na mesa, perde a disputa. */
function resolveInterest(s: GameState, r: Rng): void {
  const st = rivals8(s);
  for (const [actId, it] of Object.entries(st.interest)) {
    const a = s.acts[actId];
    const lb = s.labels[it.lb];
    if (!a || !lb || !lb.active || !free(a) || s.week - it.w > 30) { delete st.interest[actId]; continue; }
    if (!r.chance(0.18) || lb.cash < money(s, expectedAdvance(s, a) * 1.3)) continue;
    const offer = s.offers.find((o) => o.actId === actId && (o.status === 'pending' || o.status === 'counter'));
    signWithRival(s, a, lb.id, r);
    delete st.interest[actId];
    const key = rivals8(s).scene[lb.id];
    if (offer) {
      offer.status = 'sniped';
      offer.note = lb.name;
      s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 8;
      logMove(s, lb, { k: 'outbid', a: a.name });
      notify(s, fmtL(l('{b} ofereceu um contrato mais atraente e assinou {a}. Eles já estavam de olho.', '{b} made a more attractive offer and signed {a}. They had been watching.'), { b: lb.name, a: a.name }), 'bad');
    } else logMove(s, lb, { k: 'scene_sign', a: a.name, x: key && `${a.city}:${a.genre}` === key ? key : `${a.city}:${a.genre}` });
  }
}

// ---------------------------------------------------------------- decisão: compra de contrato do jogador

const BUYOUT_EVENTS: EventDef[] = [{
  id: 'r8_buyout', cat: 'contract', tone: 'neutral', tags: [], cooldown: 8, forcedOnly: true,
  title: l('{labelName} quer comprar {act}', '{labelName} wants to buy {act}'),
  text: l('{labelName} esperou você arriscar e agora que {act} está subindo oferece {feeTxt} pelo contrato. É o jeito deles: comprar o que outros construíram.', '{labelName} waited for you to take the risk and, now that {act} is rising, offers {feeTxt} for the contract. It is their way: buying what others built.'),
  options: [
    { id: 'sell', label: l('Vender o contrato', 'Sell the contract'), hint: l('Dinheiro agora; o artista lembra que foi vendido.', 'Cash now; the artist remembers being sold.'), apply: (s, r, c) => {
      const a = s.acts[String(c.act)]; const lb = s.labels[String(c.label)];
      if (!a || !lb || a.owner !== 'player') return;
      const fee = money(s, Number(c.fee));
      post(s, `r8sell:${a.id}:${s.week}`, fee, 'asset_sales', `Venda do contrato de ${a.name}`);
      lb.cash -= fee;
      bondNote(s, a, 'abandon', lb.name);
      endContract(s, a, 'terminated');
      signWithRival(s, a, lb.id, r);
    } },
    { id: 'keep', label: l('Recusar e valorizar o artista (+2 pontos de royalty)', 'Refuse and reward the artist (+2 royalty points)'), hint: l('Margem menor; confiança e memória de apoio.', 'Lower margin; trust and a memory of support.'), apply: (s, _r, c) => {
      const a = s.acts[String(c.act)];
      const k = a?.contractId ? s.contracts[a.contractId] : undefined;
      if (!a || !k) return;
      k.royalty = clamp(k.royalty + 0.02, 0, 0.6);
      a.trust = clamp(a.trust + 6, 0, 100);
      bondNote(s, a, 'support', l('recusou vender', 'refused to sell').pt);
      s.rivalries[String(c.label)] = (s.rivalries[String(c.label)] ?? 0) + 5;
    } },
    { id: 'refuse', label: l('Recusar sem conversa', 'Refuse flatly'), apply: (s, _r, c) => {
      const a = s.acts[String(c.act)];
      if (!a) return;
      // quem é leal gosta de não ter sido vendido; quem escuta rivais fica curioso
      a.trust = clamp(a.trust + (prefsOf(s, a).loyalty >= 50 ? 2 : -3), 0, 100);
      s.rivalries[String(c.label)] = (s.rivalries[String(c.label)] ?? 0) + 8;
    } },
  ],
}];
deferEvents(BUYOUT_EVENTS);

// ---------------------------------------------------------------- efeitos e propostas

// aposta tecnológica: lançamentos do selo rendem mais enquanto o formato é novo
registerMod('appeal', 'rivals8', (s, v, c) => {
  const rel = c.release;
  if (!rel || rel.owner === 'player') return null;
  const bet = rivals8(s).tech[rel.owner];
  return bet && bet.until >= s.year ? { value: v * 1.12, label: l('Aposta tecnológica do selo', 'Label\'s tech bet') } : null;
});

registerOfferMod('rivals8', (s, a) => {
  const st = rivals8(s);
  const it = st.interest[a.id];
  if (it && s.labels[it.lb]?.active) return { delta: -0.06, reason: fmtL(l('{b} também está negociando, com contrato mais atraente.', '{b} is negotiating too, with a more attractive deal.'), { b: s.labels[it.lb].name }) };
  const key = `${a.city}:${a.genre}`;
  for (const [lbId, sc] of Object.entries(st.scene)) {
    if (sc !== key) continue;
    const lb = s.labels[lbId];
    if (lb?.active) return { delta: -0.04, reason: fmtL(l('A cena gira em torno de {b}.', 'The scene revolves around {b}.'), { b: lb.name }) };
  }
  return null;
});

// ---------------------------------------------------------------- tick

registerSimHook('month', 'rivals8', (s, r) => {
  const all = Object.values(s.acts);
  for (const lb of Object.values(s.labels)) {
    if (!lb.active) continue;
    const pb = playbookOf(lb);
    if (pb === 'vulture') vulture(s, r, lb, all);
    else if (pb === 'scene') sceneOwner(s, r, lb);
    else if (pb === 'catalog') catalogKeeper(s, r, lb);
    else if (pb === 'tech') techBettor(s, r, lb);
    else stageAndFans(s, r, lb);
  }
  resolveInterest(s, r);
  const st = rivals8(s);
  for (const id of Object.keys(st.log)) if (!s.labels[id]?.active) delete st.log[id];
  for (const id of Object.keys(st.scene)) if (!s.labels[id]?.active) delete st.scene[id];
  for (const id of Object.keys(st.clash)) if (!s.pendingReleases.some((p) => p.id === id)) delete st.clash[id];
});

// antecipar a data: Abutre e Tecnologia colocam um single forte na semana do lançamento do jogador
registerSimHook('week', 'rivals8', (s, r) => {
  const st = rivals8(s);
  if (s.week - st.lastClash < 16 || !s.pendingReleases.length) return;
  for (const pr of s.pendingReleases) {
    const d = pr.week - s.week;
    if (d < 1 || d > 3 || st.clash[pr.id]) continue;
    const mineAct = s.acts[pr.actId];
    if (!mineAct || (mineAct.owner !== 'player' && !mineAct.playerBand)) continue;
    st.clash[pr.id] = 1;
    if (!r.chance(0.3)) continue;
    const fam = familyOf(mineAct.genre);
    const labels = Object.values(s.labels).filter((lb) => lb.active && lb.cash > money(s, 100000) && (playbookOf(lb) === 'vulture' || playbookOf(lb) === 'tech'));
    for (const lb of r.shuffle(labels)) {
      const act = lb.roster.map((id) => s.acts[id]).filter((a) => a && a.status === 'active' && familyOf(a.genre) === fam && unreleasedRecorded(s, a).length > 0).sort((x, y) => y.fame - x.fame)[0];
      if (!act) continue;
      const songs = unreleasedRecorded(s, act).sort((x, y) => y.q - x.q);
      const budget = 12000 * (0.5 + act.fame / 40);
      lb.cash -= money(s, budget);
      launchNpcRelease(s, r, act, lb.id, [songs[0].id], 'single', budget);
      st.lastClash = s.week;
      logMove(s, lb, { k: 'date_move', a: act.name, x: pr.title });
      s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 4;
      notify(s, fmtL(l('{b} antecipou o lançamento de {a} para a semana do seu "{t}". Mudar a data ou reforçar a divulgação?', '{b} moved {a}\'s release into the week of your "{t}". Move your date or boost promotion?'), { b: lb.name, a: act.name, t: pr.title }), 'bad');
      break;
    }
    if (st.lastClash === s.week) break;
  }
});

// abandonar um mercado quando o caixa aperta (o espaço fica aberto para quem chegar)
registerSimHook('year', 'rivals8', (s, r) => {
  for (const lb of Object.values(s.labels)) {
    if (!lb.active || lb.territories.length < 3) continue;
    if (lb.cash > money(s, 250000) && lb.revenueLastYear > money(s, 100000)) continue;
    if (!r.chance(0.5)) continue;
    const home = cityById[lb.city]?.market;
    const drop = [...lb.territories].reverse().find((m) => m !== home);
    if (!drop) continue;
    lb.territories = lb.territories.filter((m) => m !== drop);
    logMove(s, lb, { k: 'abandon', x: drop });
    if (s.player.territories.includes(drop)) notify(s, fmtL(l('{b} abandonou o mercado {m}: há espaço aberto.', '{b} abandoned the {m} market: there is room now.'), { b: lb.name, m: marketById[drop].name }), 'info');
  }
});
