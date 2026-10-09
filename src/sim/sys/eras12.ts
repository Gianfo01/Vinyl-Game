// Estrutura da empresa x era (rodada 12): cada virada tecnológica muda QUAIS departamentos fazem um selo
// funcionar. O jogador tem uma estrutura (fatias de equipe em 7 departamentos); a era tem uma demanda.
// O encaixe (fit) cai sozinho quando a era muda — quem era eficiente no rádio sofre na TV de clipes, e
// quem era eficiente no CD apanha da pirataria. Na virada, uma decisão de reorganização oferece caminhos
// com custos e trocas; cada departamento tem um efeito concreto (rádio→singles, fábrica→prensagem e
// distribuição, A&R→LPs e catálogo, imagem→lançamentos novos, digital→novas receitas e pirataria,
// dados→cauda de streams e dependência de plataforma, direitos→consentimento e licença de vozes).

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { emitEvent, type EventDef } from '../events';
import { deferEvents, registerExt4, registerMod, registerSimHook } from '../ext4';
import type { GameState, Release } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { currentEra, eraById, type EraId } from './eras8';

export type Dept = 'promo' | 'plant' | 'studio' | 'image' | 'digital' | 'data' | 'rights';
export const DEPTS: Dept[] = ['promo', 'plant', 'studio', 'image', 'digital', 'data', 'rights'];
export type Alloc = Record<Dept, number>;

export const DEPT_NAME: Record<Dept, L> = {
  promo: l('Promoção (rádio e TV)', 'Promotion (radio and TV)'), plant: l('Fábrica e distribuição', 'Manufacturing and distribution'),
  studio: l('A&R e produção', 'A&R and production'), image: l('Imagem e audiovisual', 'Image and audiovisual'),
  digital: l('Digital e novas receitas', 'Digital and new revenue'), data: l('Dados e retenção', 'Data and retention'), rights: l('Direitos e consentimento', 'Rights and consent'),
};
export const DEPT_FX: Record<Dept, L> = {
  promo: l('apelo dos singles', 'singles appeal'), plant: l('vendas e custo de prensagem', 'sales and pressing cost'), studio: l('apelo de LPs/EPs e vendas de catálogo', 'LP/EP appeal and catalog sales'),
  image: l('apelo dos lançamentos novos', 'appeal of new releases'), digital: l('receita digital mensal e perda para a pirataria', 'monthly digital revenue and piracy leakage'),
  data: l('vendas de discos com 3–12 meses (retenção)', 'sales of 3–12 month records (retention)'), rights: l('risco de escândalo de voz, licença de vozes, apelo de atos humanos', 'voice-scandal risk, voice licensing, human-act appeal'),
};

const P = (promo: number, plant: number, studio: number, image: number, digital = 0, data = 0, rights = 0): Alloc => ({ promo, plant, studio, image, digital, data, rights });
/** O que cada era exige da estrutura (soma 1). */
export const DEMAND: Record<EraId, Alloc> = {
  radio: P(0.45, 0.35, 0.15, 0.05), jukebox: P(0.4, 0.4, 0.15, 0.05), albums: P(0.25, 0.25, 0.45, 0.05), rocknroll: P(0.4, 0.3, 0.15, 0.15),
  fm: P(0.3, 0.2, 0.4, 0.1), disco: P(0.35, 0.3, 0.15, 0.2), video: P(0.2, 0.2, 0.15, 0.45), cd: P(0.15, 0.3, 0.35, 0.2),
  piracy: P(0.1, 0.1, 0.2, 0.15, 0.3, 0, 0.15), download: P(0.1, 0.05, 0.15, 0.15, 0.4, 0.1, 0.05), streaming: P(0.05, 0, 0.15, 0.15, 0.2, 0.45, 0),
  viral: P(0.05, 0, 0.1, 0.3, 0.15, 0.4, 0), synthetic: P(0, 0, 0.25, 0.1, 0.1, 0.2, 0.35), neural: P(0, 0, 0.25, 0.05, 0.1, 0.25, 0.35), postai: P(0, 0, 0.35, 0.15, 0.1, 0.15, 0.25),
};
/** Por que a virada importa (vai para o noticiário). */
export const SHIFT_WHY: Record<EraId, L> = {
  radio: l('Quem toca na rádio, prensa rápido e chega às lojas vence.', 'Whoever gets radio play, presses fast and reaches stores wins.'),
  jukebox: l('Cada bar com jukebox é uma vitrine: distribuição e prensagem decidem.', 'Every jukebox bar is a shop window: distribution and pressing decide.'),
  albums: l('O LP pede coerência artística, produção caprichada e catálogo que dura.', 'The LP demands artistic coherence, careful production and a lasting catalog.'),
  rocknroll: l('Rádio jovem e TV ao vivo: promoção agressiva e imagem viram armas.', 'Youth radio and live TV: aggressive promotion and image become weapons.'),
  fm: l('O FM toca álbuns inteiros: A&R e produção valem mais que o single.', 'FM plays whole albums: A&R and production matter more than singles.'),
  disco: l('As pistas mandam: promoção nos clubes, prensagem de 12" e visual.', 'Dancefloors rule: club promotion, 12" pressing and looks.'),
  video: l('Sem clipe não existe: imagem, orçamento audiovisual e exposição na TV.', 'No video, no existence: image, audiovisual budget and TV exposure.'),
  cd: l('O CD relança tudo: catálogo, remasterização e fábricas de disco.', 'The CD reissues everything: catalog, remastering and disc plants.'),
  piracy: l('As vendas físicas desabam: reestruturar, cortar fábrica e achar receitas novas.', 'Physical sales collapse: restructure, cut manufacturing and find new revenue.'),
  download: l('A loja virou digital: equipe digital e licenças pagam as contas.', 'The store went digital: a digital team and licensing pay the bills.'),
  streaming: l('Retenção de ouvintes, frequência de lançamentos e dependência das plataformas.', 'Listener retention, release frequency and platform dependence.'),
  viral: l('Vídeos curtos decidem: imagem e dados de retenção, segundo a segundo.', 'Short videos decide: image and retention data, second by second.'),
  synthetic: l('Vozes sintéticas: consentimento, diferenciação e controle de direitos.', 'Synthetic voices: consent, differentiation and rights control.'),
  neural: l('Feeds neurais: direitos de voz e dados valem mais que fábricas.', 'Neural feeds: voice rights and data are worth more than plants.'),
  postai: l('Depois da enxurrada de IA, o humano e o autoral voltam a valer.', 'After the AI flood, the human and the authored are valuable again.'),
};

type Choice = 'overhaul' | 'gradual' | 'acquire' | 'hold';
export const CHOICE_NAME: Record<Choice, L> = {
  overhaul: l('Reestruturação radical', 'Radical restructuring'), gradual: l('Transição gradual', 'Gradual transition'),
  acquire: l('Comprar um especialista', 'Acquire a specialist'), hold: l('Manter a estrutura (especialista do passado)', 'Keep the structure (old-era specialist)'),
};
export interface Org12 { alloc: Alloc; era?: EraId; target?: Alloc; disrupt: number; legacy: number; lastMove: number; log: { y: number; era: EraId; fit: number; choice?: Choice }[] }

declare module '../ext4' { interface Ext4 { org12: Org12 } }
const blank = (): Org12 => ({ alloc: { ...DEMAND.radio }, disrupt: -1, legacy: -1, lastMove: -99, log: [] });
registerExt4('org12', blank);
export const org12 = (s: GameState): Org12 => {
  const x = s.x4 as unknown as { org12?: Org12 };
  x.org12 ??= blank();
  return x.org12;
};

const norm = (a: Alloc): Alloc => { const t = DEPTS.reduce((v, d) => v + Math.max(0, a[d]), 0) || 1; return Object.fromEntries(DEPTS.map((d) => [d, Math.max(0, a[d]) / t])) as Alloc; };
const tv = (a: Alloc, b: Alloc) => DEPTS.reduce((v, d) => v + Math.abs(a[d] - b[d]), 0) / 2;
export const demandNow = (s: GameState): Alloc => DEMAND[currentEra(s).id];
/** Encaixe da estrutura com a era (0–1). */
export const fitOf = (s: GameState): number => clamp(1 - tv(org12(s).alloc, demandNow(s)), 0, 1);
/** Cobertura de um departamento (fatia / demanda), só onde a era exige ≥ 10%. */
export function coverage(s: GameState, d: Dept): number | null {
  const need = demandNow(s)[d];
  return need >= 0.1 ? Math.min(1.25, org12(s).alloc[d] / need) : null;
}
/** Efeito (fração) de um departamento: cobertura 0,25 → −8%, 1 → +4%, 1,25 → +8%. */
export function deptK(s: GameState, d: Dept): number {
  const c = coverage(s, d);
  return c === null ? 0 : (c - 0.75) * 0.16;
}
export const platformDependence = (s: GameState): boolean => ['streaming', 'viral'].includes(currentEra(s).id) && org12(s).alloc.data + org12(s).alloc.digital > 0.6;

const mineRel = (s: GameState, rel: Release | undefined) => !!rel && (rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand);
const LBL = l('Estrutura da empresa', 'Company structure');

registerMod('appeal', 'org12', (s, v, c) => {
  const rel = c.release;
  if (!mineRel(s, rel) || !rel) return null;
  let k = 0.92 + 0.13 * fitOf(s);
  if (rel.type === 'single') k += deptK(s, 'promo');
  else k += deptK(s, 'studio');
  if (!rel.reissueOf && rel.kind !== 'compilation') k += deptK(s, 'image');
  if (c.act && c.act.archetype !== 'synthetic') k += deptK(s, 'rights') * 0.5;
  if (s.week < org12(s).disrupt) k -= 0.05;
  return Math.abs(k - 1) < 0.003 ? null : { value: v * k, label: LBL };
});

registerMod('chartUnits', 'org12', (s, v, c) => {
  const rel = c.release;
  if (!mineRel(s, rel) || !rel) return null;
  const age = s.week - rel.week;
  let k = 1 + deptK(s, 'plant') + deptK(s, 'digital');
  if (age > 52) k += deptK(s, 'studio') + (s.week < org12(s).legacy ? 0.08 : 0);
  else if (age >= 12) k += deptK(s, 'data') * 1.5;
  if (platformDependence(s)) k -= 0.04;
  return Math.abs(k - 1) < 0.003 ? null : { value: v * k, label: LBL };
});

registerMod('pressingCost', 'org12', (s, v) => {
  const k = 1 - deptK(s, 'plant') * 0.8;
  return Math.abs(k - 1) < 0.003 ? null : { value: v * k, label: LBL };
});

const nActs = (s: GameState) => playerActs(s).filter((id) => s.acts[id] && s.acts[id].status !== 'retired' && s.acts[id].status !== 'split').length;
export const reorgCost = (s: GameState, c: Choice): number => money(s, c === 'overhaul' ? 12000 + 1500 * nActs(s) : c === 'gradual' ? 4000 : c === 'acquire' ? 20000 : 0);
export const MOVE_STEP = 0.1;
export const moveCost = (s: GameState): number => money(s, 1500);

/** Remaneja equipe de um departamento para outro (10 pontos). */
export function moveStaff(s: GameState, from: Dept, to: Dept): L | null {
  const o = org12(s);
  if (from === to) return l('Escolha departamentos diferentes.', 'Pick different departments.');
  if (s.week - o.lastMove < 4) return l('A equipe ainda está se ajustando: espere um mês.', 'Staff are still adjusting: wait a month.');
  if (o.alloc[from] < 0.02) return l('Esse departamento já está vazio.', 'That department is already empty.');
  const c = moveCost(s);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `org12:move:${from}:${to}`, -c, 'admin', `Remanejamento ${from}→${to}`);
  const d = Math.min(MOVE_STEP, o.alloc[from]);
  o.alloc[from] -= d; o.alloc[to] += d;
  o.alloc = norm(o.alloc);
  o.lastMove = s.week;
  delete o.target;
  return null;
}

export function applyChoice(s: GameState, choice: Choice): void {
  const o = org12(s);
  const e = currentEra(s);
  const dem = DEMAND[e.id];
  const cost = reorgCost(s, choice);
  if (cost && s.player.cash < cost) {
    notify(s, fmtL(l('Sem caixa para "{c}": a estrutura fica como está.', 'No cash for "{c}": the structure stays as it is.'), { c: CHOICE_NAME[choice] }), 'bad');
    choice = 'hold';
  } else if (cost) post(s, `org12:${choice}:${e.id}`, -cost, 'admin', `${CHOICE_NAME[choice].pt} (${e.name.pt})`);
  if (choice === 'overhaul') {
    o.alloc = { ...dem };
    o.disrupt = s.week + 26;
    s.player.reputation.artists = clamp(s.player.reputation.artists - 2, 0, 100);
  } else if (choice === 'gradual') o.target = { ...dem };
  else if (choice === 'acquire') {
    const top = DEPTS.slice().sort((a, b) => dem[b] - o.alloc[b] - (dem[a] - o.alloc[a]))[0];
    o.alloc[top] += 0.3;
    o.alloc = norm(o.alloc);
    o.target = { ...dem };
  } else o.legacy = s.week + 104;
  const last = o.log[o.log.length - 1];
  if (last && last.era === e.id) last.choice = choice;
  remember(s, 'org12', fmtL(l('{e}: o selo escolhe "{c}". Encaixe com a era agora: {f}%.', '{e}: the label chooses "{c}". Fit with the era now: {f}%.'), { e: e.name, c: CHOICE_NAME[choice], f: Math.round(fitOf(s) * 100) }), { important: true });
}

const HINT: Record<Choice, L> = {
  overhaul: l('Custo alto agora (cresce com o elenco); a estrutura já nasce no formato da era, mas 6 meses de caos interno (−5% apelo) e artistas inseguros.', 'High cost now (grows with the roster); the structure snaps to the era, but 6 months of internal chaos (−5% appeal) and nervous artists.'),
  gradual: l('Custo baixo; a equipe migra ~20% por mês rumo à era. Você sofre o desencaixe por alguns meses.', 'Low cost; staff migrate ~20% a month toward the era. You suffer the misfit for a few months.'),
  acquire: l('Caro: compra uma firma pronta no departamento que mais falta (+30% nele já) e o resto migra devagar.', 'Expensive: buy a ready firm in the most-lacking department (+30% there at once); the rest migrates slowly.'),
  hold: l('Grátis: você vira especialista do passado — catálogo +8% por 2 anos, mas o desencaixe continua cobrando.', 'Free: you become an old-era specialist — catalog +8% for 2 years, but the misfit keeps costing you.'),
};
deferEvents(Object.keys(DEMAND).map((id): EventDef => ({
  id: `org12_${id}`, cat: 'business', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
  title: fmtL(l('Reorganizar a empresa: {e}', 'Reorganize the company: {e}'), { e: eraById[id as EraId].name }),
  text: { pt: `${SHIFT_WHY[id as EraId].pt} A estrutura que funcionava ficou desalinhada. Como reorganizar?`, en: `${SHIFT_WHY[id as EraId].en} The structure that worked is now misaligned. How do you reorganize?` },
  options: (['overhaul', 'gradual', 'acquire', 'hold'] as Choice[]).map((c) => ({ id: c, label: CHOICE_NAME[c], hint: HINT[c], apply: (s: GameState) => applyChoice(s, c) })),
})));

registerSimHook('month', 'org12', (s) => {
  const o = org12(s);
  const e = currentEra(s);
  if (!o.era) { o.era = e.id; o.alloc = { ...DEMAND[e.id] }; return; } // começa adaptado à era inicial
  if (o.era !== e.id) {
    const before = Math.round(fitOf(s) * 100);
    const drop = tv(DEMAND[o.era], DEMAND[e.id]);
    o.era = e.id;
    o.log.push({ y: s.year, era: e.id, fit: before });
    if (o.log.length > 20) o.log.shift();
    const txt = fmtL(l('Virada de era — {e}: {w} A estrutura do selo encaixa só {f}% no novo jogo.', 'Era shift — {e}: {w} The label\'s structure now fits only {f}% of the new game.'), { e: e.name, w: SHIFT_WHY[e.id], f: before });
    remember(s, 'org12_shift', txt, { important: true });
    notify(s, txt, 'event');
    if (drop >= 0.12) emitEvent(s, Rng.fromSeed(`${s.config.seed}:org12:${s.week}`), `org12_${e.id}`, {});
  }
  if (o.target) {
    for (const d of DEPTS) o.alloc[d] += (o.target[d] - o.alloc[d]) * 0.2;
    o.alloc = norm(o.alloc);
    if (tv(o.alloc, o.target) < 0.03) { o.alloc = { ...o.target }; delete o.target; notify(s, l('A reorganização terminou: a estrutura está no formato da era.', 'Reorganization complete: the structure matches the era.'), 'good'); }
  }
  const n = nActs(s);
  if (!n) return;
  const fit = fitOf(s);
  const waste = Math.round(money(s, (200 + 60 * n) * (1 - fit)));
  if (waste > 0 && fit < 0.9) post(s, 'org12:waste', -waste, 'admin', 'Retrabalho e equipe ociosa (estrutura desalinhada)');
  const dig = coverage(s, 'digital');
  if (dig !== null) post(s, 'org12:digital', Math.round(money(s, 45 * n * dig)), 'sales', 'Novas receitas digitais');
  const rights = coverage(s, 'rights');
  if (rights !== null) {
    if (rights >= 1) post(s, 'org12:voices', money(s, 300), 'sales', 'Licença de vozes com consentimento');
    else if (rights < 0.6 && Rng.fromSeed(`${s.config.seed}:org12r:${s.week}`).chance(0.05 * (1 - rights))) {
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
      const t = l('Escândalo: sem equipe de direitos, uma voz clonada sem consentimento sai num disco do selo.', 'Scandal: with no rights team, a voice cloned without consent ships on one of the label\'s records.');
      notify(s, t, 'bad');
      remember(s, 'org12_scandal', t, { important: true });
    }
  }
});
