// Rodada 18 (econ18, ponto 2): cláusulas de contrato negociáveis.
// Antes: 50% da gravação entrava no recuperável, sempre. Agora cada acordo diz QUAIS despesas são recuperáveis
// (gravação, clipe, apoio de turnê, parte do marketing), o teto de gasto que exige autorização do artista,
// recuperação por projeto ou cruzada, a base dos royalties (preço de varejo / atacado / receita líquida, com
// dedução de embalagem por época), a prestação de contas (período, atraso, direito de auditoria), compromissos
// de lançamento e divulgação e as consequências de engavetar. O artista avalia pelo momento, ambição, assessoria
// (empresário/advogado) e confiança — e as cláusulas continuam pesando nos anos seguintes.
import { clamp, Rng, seedState } from '../../core/rng';
import { toReal } from '../../core/money';
import { l, type L } from '../../data/world';
import { registerContractHook } from '../contracts';
import { deferEvents, registerSimHook } from '../ext4';
import { mainAmbition } from '../people';
import type { Act, Contract, GameState, Offer, RightsTerms } from '../types';
import { fmtL, money, notify, post, remember } from '../util';
import { fin18 } from '../ledger18';
import { mgrName, repOf } from './managers14';
import { emitEvent } from '../events';
import { postHooks18 } from '../ledger18';
import { fileLawsuit } from '../business';
import type { EventDef } from '../events';

export interface Clauses18 {
  /** pacote de origem (só rótulo) */
  pkg: string;
  /** fração da gravação que entra no recuperável */
  rec: 0 | 0.5 | 1;
  video: boolean;
  tour: boolean;
  /** fração do marketing do artista que entra no recuperável */
  mkt: 0 | 0.25 | 0.5;
  /** teto por projeto (US$ reais) acima do qual o gasto precisa de autorização do artista; 0 = sem teto */
  cap: number;
  /** recuperação cruzada (todos os projetos e o adiantamento) × por projeto */
  cross: boolean;
  base: 'retail' | 'wholesale' | 'net';
  /** prestação de contas: trimestral, semestral, anual; meses de atraso depois do período */
  stmt: 'q' | 's' | 'a';
  lag: number;
  audit: boolean;
  /** lançamentos garantidos no prazo do contrato */
  minRel: number;
  /** verba mínima de divulgação por lançamento (US$ reais), gasta automaticamente */
  promo: number;
}
type OfferLike = Omit<Offer, 'id' | 'week' | 'status'>;
type C18 = Contract & { clauses18?: Clauses18; rb18?: Record<string, number>; rp18?: Record<string, string>; spent18?: Record<string, number> };

export interface Pkg18 { id: string; name: L; desc: L; c: Clauses18; rights?: Partial<RightsTerms> }
const base = (o: Partial<Clauses18>): Clauses18 => ({ pkg: 'custom', rec: 0.5, video: false, tour: false, mkt: 0, cap: 0, cross: true, base: 'wholesale', stmt: 's', lag: 3, audit: false, minRel: 0, promo: 0, ...o });
export const PKG18: Pkg18[] = [
  { id: 'major', name: l('Major clássico', 'Classic major'), desc: l('Master do selo para sempre; recupera gravação, clipe, apoio de turnê e metade do marketing, tudo cruzado. Royalty sobre varejo com dedução de embalagem; contas semestrais.', 'Label owns the master forever; recoups recording, video, tour support and half the marketing, all cross-collateralized. Royalty on retail with packaging deduction; semiannual statements.'),
    c: base({ pkg: 'major', rec: 1, video: true, tour: true, mkt: 0.5, cross: true, base: 'retail', stmt: 's', lag: 3 }), rights: { reversionYears: 0 } },
  { id: 'license', name: l('Licença por prazo + 2 lançamentos', 'Term license + 2 releases'), desc: l('O master volta ao artista 7 anos após o fim; só metade da gravação é recuperável, por projeto. Dois lançamentos garantidos com verba mínima; contas trimestrais e auditoria.', 'The master reverts 7 years after the term; only half of recording is recoupable, per project. Two guaranteed releases with a promo floor; quarterly statements and audit rights.'),
    c: base({ pkg: 'license', rec: 0.5, cap: 25000, cross: false, base: 'net', stmt: 'q', lag: 2, audit: true, minRel: 2, promo: 5000 }), rights: { reversionYears: 7, reversionNeedsRecoup: false } },
  { id: 'indie', name: l('Indie (receita líquida)', 'Indie (net receipts)'), desc: l('Royalty sobre a receita líquida, sem embalagem; recupera gravação e clipe por projeto. Um lançamento garantido; master volta em 10 anos se recuperado.', 'Royalty on net receipts, no packaging; recoups recording and video per project. One guaranteed release; master reverts in 10 years if recouped.'),
    c: base({ pkg: 'indie', rec: 1, video: true, mkt: 0.25, cross: false, base: 'net', stmt: 's', lag: 3, audit: true, minRel: 1 }), rights: { reversionYears: 10, reversionNeedsRecoup: true } },
  { id: 'artist', name: l('Pró-artista', 'Artist-friendly'), desc: l('Nada recuperável além do adiantamento; teto de gasto com aprovação; contas trimestrais rápidas; 2 lançamentos e verba garantidos; master volta em 5 anos.', 'Nothing recoupable beyond the advance; spending cap needs approval; fast quarterly statements; 2 releases and promo guaranteed; master reverts in 5 years.'),
    c: base({ pkg: 'artist', rec: 0, cap: 15000, cross: false, base: 'net', stmt: 'q', lag: 1, audit: true, minRel: 2, promo: 10000 }), rights: { reversionYears: 5, reversionNeedsRecoup: false } },
];
export const pkg18 = (id: string): Pkg18 | undefined => PKG18.find((p) => p.id === id);
/** contratos antigos (sem cláusulas): o padrão de antes (50% da gravação, cruzado, sem dedução) */
export const LEGACY18: Clauses18 = base({ pkg: 'legacy' });
export const clausesOf = (c: Contract | undefined): Clauses18 | undefined => (c as C18 | undefined)?.clauses18;

/** aplica um pacote numa proposta (cláusulas + reversão na ficha de direitos) */
export function applyPkg18(o: OfferLike, id: string): void {
  const p = pkg18(id);
  if (!p) return;
  (o as OfferLike & { clauses18?: Clauses18 }).clauses18 = { ...p.c };
  if (o.rights && p.rights) Object.assign(o.rights, p.rights);
}

// ---------------------------------------------------------------- base dos royalties

/** dedução de embalagem por época: 10% no vinil, 25% na era do CD, 20% no digital (a polêmica "embalagem" de arquivo) */
export function packaging18(year: number, b: Clauses18['base']): number {
  if (b === 'net') return 0;
  return year < 1983 ? 0.1 : year < 2008 ? 0.25 : 0.2;
}
/** multiplicador da parte do artista conforme a base do royalty (1 = contrato antigo) */
export function baseMult18(c: Contract | undefined, year: number): number {
  const k = clausesOf(c);
  if (!k) return 1;
  const f = k.base === 'retail' ? 1.25 : k.base === 'wholesale' ? 1 : 0.88;
  return f * (1 - packaging18(year, k.base));
}

// ---------------------------------------------------------------- recuperação

type RKind = 'rec' | 'video' | 'tour' | 'mkt';
/** Lança no recuperável o que as cláusulas permitem; acima do teto, só com aprovação do artista. */
export function addRecoup18(s: GameState, c: Contract, kind: RKind, cost: number): number {
  if (cost <= 0 || c.model === 'distribution' || c.model === 'licensing') return 0;
  if (c.party !== 'player') { if (kind !== 'rec') return 0; const v0 = Math.round(cost * 0.5); c.recoupBalance += v0; return v0; } // selo rival: regra antiga
  const cc = c as C18;
  const k = cc.clauses18;
  const frac = !k ? (kind === 'rec' ? 0.5 : 0) : kind === 'rec' ? k.rec : kind === 'mkt' ? k.mkt : k[kind] ? 1 : 0;
  let v = Math.round(cost * frac);
  if (!v) return 0;
  const act = s.acts[c.actId];
  const proj = `p${c.releasesDone}`;
  if (k?.cap && act) {
    const spent = ((cc.spent18 ??= {})[proj] ?? 0) + toReal(cost, s.year);
    cc.spent18[proj] = spent;
    if (spent > k.cap) {
      // estourou o teto: o artista autoriza se confia; senão a despesa fica com o selo
      if (act.trust >= 60) {
        if (spent - toReal(cost, s.year) <= k.cap) notify(s, fmtL(l('{a} autorizou passar do teto do projeto (cláusula de aprovação).', '{a} approved going over the project cap (approval clause).'), { a: act.name }));
      } else {
        act.trust = clamp(act.trust - 2, 0, 100);
        if (spent - toReal(cost, s.year) <= k.cap) notify(s, fmtL(l('{a} não autorizou gastar acima do teto: o excedente não é recuperável e a confiança cai.', '{a} did not approve spending above the cap: the excess is not recoupable and trust drops.'), { a: act.name }), 'bad');
        return 0;
      }
    }
  }
  c.recoupBalance += v;
  if (k && !k.cross) (cc.rb18 ??= {})[proj] = ((cc.rb18 ??= {})[proj] ?? 0) + v;
  return v;
}

/** Quanto do saldo pode ser abatido nas vendas deste lançamento (por projeto: só o projeto + o adiantamento). */
export function recoupable18(c: Contract, relId: string): number {
  const cc = c as C18;
  const k = cc.clauses18;
  if (!k || k.cross || !cc.rb18) return c.recoupBalance;
  const proj = (cc.rp18 ??= {})[relId] ?? (cc.rp18[relId] = `p${Math.max(0, c.releasesDone - 1)}`);
  const projSum = Object.values(cc.rb18).reduce((t, x) => t + x, 0);
  const adv = Math.max(0, c.recoupBalance - projSum);
  return Math.min(c.recoupBalance, adv + (cc.rb18[proj] ?? 0));
}
export function takeRecoup18(c: Contract, relId: string, v: number): void {
  const cc = c as C18;
  if (!cc.clauses18 || cc.clauses18.cross || !cc.rb18) return;
  const proj = cc.rp18?.[relId];
  if (proj && cc.rb18[proj]) { const x = Math.min(v, cc.rb18[proj]); cc.rb18[proj] -= x; if (cc.rb18[proj] <= 0) delete cc.rb18[proj]; }
}

// ---------------------------------------------------------------- como o artista lê a proposta

/** assessoria: 2 = empresário de verdade, 1 = advogado (fama ou caixa), 0 = sozinho */
export function advisor18(s: GameState, act: Act): number {
  return repOf(s, act.id) ? 2 : act.fame >= 25 || toReal(act.cash, s.year) > 30000 ? 1 : 0;
}
export interface Why18 { f: L; d: number }
/** Raciocínio do artista sobre as cláusulas (cada linha com peso). Sem assessoria, ele mal lê as letras miúdas. */
export function reason18(s: GameState, act: Act, o: OfferLike): Why18[] {
  const k = (o as OfferLike & { clauses18?: Clauses18 }).clauses18;
  if (!k || o.model === 'distribution') return [];
  const amb = mainAmbition(s, act);
  const adv = advisor18(s, act);
  const see = adv === 2 ? 1 : adv === 1 ? 0.75 : 0.35;
  const out: Why18[] = [];
  const add = (d: number, f: L) => { if (Math.abs(d) >= 0.005) out.push({ f, d }); };
  const money_ = amb === 'money' || amb === 'security' ? 1.3 : 1;
  const eff = (k.base === 'retail' ? 1.25 : k.base === 'wholesale' ? 1 : 0.88) * (1 - packaging18(s.year, k.base));
  add((eff - 0.85) * 0.3 * see * money_, fmtL(l('Base do royalty: {b}, embalagem −{p}% → vale {e}% do nominal.', 'Royalty base: {b}, packaging −{p}% → worth {e}% of headline.'), { b: k.base === 'retail' ? l('varejo', 'retail') : k.base === 'wholesale' ? l('atacado', 'wholesale') : l('receita líquida', 'net receipts'), p: Math.round(packaging18(s.year, k.base) * 100), e: Math.round(eff * 100) }));
  if (adv && s.year >= 2008 && k.base !== 'net') add(-0.03, l('O advogado chama a dedução de "embalagem" no digital de abuso.', 'Their lawyer calls a "packaging" deduction on digital abusive.'));
  const burden = k.rec * 0.04 + (k.video ? 0.02 : 0) + (k.tour ? 0.025 : 0) + k.mkt * 0.08;
  add(-burden * see * money_, fmtL(l('Recuperável: gravação {r}%{v}{t}{m}.', 'Recoupable: recording {r}%{v}{t}{m}.'), { r: k.rec * 100, v: k.video ? l(', clipes', ', videos') : '', t: k.tour ? l(', apoio de turnê', ', tour support') : '', m: k.mkt ? fmtL(l(', {m}% do marketing', ', {m}% of marketing'), { m: k.mkt * 100 }) : '' }));
  add(k.cross ? -0.03 * see : 0.015 * see, k.cross ? l('Recuperação cruzada: um disco que vende paga a dívida do outro.', 'Cross-collateralized: a hit pays off the flop\'s debt.') : l('Recuperação por projeto: cada disco responde só por si.', 'Per-project recoupment: each record stands alone.'));
  if (k.cap) add(0.025 * (amb === 'art' || amb === 'freedom' ? 1.8 : 1), fmtL(l('Teto de US$ {c} por projeto só com a assinatura deles.', 'US$ {c} cap per project needs their sign-off.'), { c: Math.round(k.cap / 1000) + 'k' }));
  add(k.stmt === 'q' ? 0.02 : k.stmt === 'a' ? -0.03 : 0, k.stmt === 'q' ? l('Contas trimestrais.', 'Quarterly statements.') : k.stmt === 'a' ? l('Contas só uma vez por ano.', 'Statements only once a year.') : l('Contas semestrais (padrão).', 'Semiannual statements (standard).'));
  if (k.lag >= 4) add(-0.015 * see, l('Atraso longo para pagar royalties.', 'Long delay before royalties are paid.'));
  if (k.audit) add(0.025 * see, l('Direito de auditoria nos livros do selo.', 'Right to audit the label\'s books.'));
  else if (adv) add(-0.02, l('Sem direito de auditoria: o assessor desconfia.', 'No audit right: their advisor is suspicious.'));
  const lowTrust = act.trust < 40;
  if (k.minRel) add(k.minRel * 0.03 * (amb === 'fame' || amb === 'art' ? 1.5 : 1) * (lowTrust ? 1.5 : 1), fmtL(l('{n} lançamento(s) garantido(s).', '{n} guaranteed release(s).'), { n: k.minRel }));
  else if (lowTrust) add(-0.05, l('Não confiam que você vá lançar: querem garantia por escrito.', 'They do not trust you will release them: they want it in writing.'));
  if (k.promo) add(Math.min(0.06, k.promo / 5000 * 0.02) * (amb === 'fame' || amb === 'status' ? 1.5 : 1), fmtL(l('Verba mínima de divulgação de US$ {p} por lançamento.', 'Promo floor of US$ {p} per release.'), { p: Math.round(k.promo / 1000) + 'k' }));
  if (toReal(act.cash, s.year) < 2000 && burden > 0.06) add(-0.02, l('Estão sem dinheiro: dívida com o selo assusta.', 'They are broke: owing the label scares them.'));
  if (!adv) out.push({ f: l('Sem empresário nem advogado: o artista lê só o adiantamento e o royalty nominal.', 'No manager or lawyer: the artist reads only the advance and headline royalty.'), d: 0 });
  else if (adv === 2) { const m = repOf(s, act.id); out.push({ f: fmtL(l('O empresário ({m}) leu cada cláusula.', 'Their manager ({m}) read every clause.'), { m: m ? mgrName(s, m) : '' }), d: 0 }); }
  return out;
}

registerContractHook('clauses18', {
  offer: (s, act, o) => {
    const w = reason18(s, act, o);
    if (!w.length) return null;
    const score = w.reduce((t, x) => t + x.d, 0);
    const top = [...w].filter((x) => x.d).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
    return { score, reason: top?.f };
  },
});

/** quanto o pacote rende ao selo (para o bot e para a dica na UI): >0 favorece o selo */
export function labelEdge18(k: Clauses18, year: number): number {
  return k.rec * 0.5 + (k.video ? 0.2 : 0) + (k.tour ? 0.2 : 0) + k.mkt + (k.cross ? 0.3 : 0) + (1 - (k.base === 'retail' ? 1.25 : k.base === 'wholesale' ? 1 : 0.88) * (1 - packaging18(year, k.base))) * 2 - k.minRel * 0.15 - k.promo / 20000 - (k.audit ? 0.1 : 0) + (k.stmt === 'a' ? 0.1 : k.stmt === 'q' ? -0.05 : 0);
}

// ---------------------------------------------------------------- execução ao longo dos anos

interface St18 { last: Record<string, number>; shelf: Record<string, number>; audits: number; rng: number }
function st18(s: GameState): St18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.c18 ??= { last: {}, shelf: {}, audits: 0, rng: 1801 }) as St18;
  st.last ??= {}; st.shelf ??= {};
  return st;
}

// lançamento: marca o projeto, gasta a verba contratual e ancora o projeto do disco
registerSimHook('launch', 'contracts18', (s, _r, a) => {
  const rel = a.release;
  if (!rel || rel.owner !== 'player') return;
  const act = s.acts[rel.actId];
  const c = act?.contractId ? s.contracts[act.contractId] as C18 : undefined;
  st18(s).last[rel.actId] = s.week;
  if (!c || c.party !== 'player') return;
  (c.rp18 ??= {})[rel.id] ??= `p${Math.max(0, c.releasesDone - 1)}`;
  const k = c.clauses18;
  if (k?.promo && rel.type !== 'single') {
    const v = money(s, k.promo);
    post(s, `c18promo:${rel.id}`, -v, 'marketing', `Verba contratual: ${rel.title}`);
    addRecoup18(s, c, 'mkt', v);
  }
});

// custos ligados a um ato (clipe, logística de turnê, marketing): o listener do livro lança no recuperável
function actOfKey(s: GameState, key: string): [string | undefined, RKind | undefined] {
  let m = /^clip:(\w+)/.exec(key);
  if (m) return [s.songs[m[1]]?.actId, 'video'];
  m = /^ro_(video|teaser|presave|deluxe):(\w+)/.exec(key);
  if (m) return [s.rollouts.find((r) => r.id === m![2])?.actId, m[1] === 'video' ? 'video' : 'mkt'];
  m = /^tour:(\w+)/.exec(key);
  if (m) return [s.tours.find((t) => t.id === m![1])?.actId, 'tour'];
  m = /^(?:out17|fyc):(\w+)/.exec(key);
  if (m) return [s.releases[m[1]]?.actId, 'mkt'];
  m = /^(?:mappromo|hype12):[^:]+:(\w+)/.exec(key);
  if (m) return [m[1], 'mkt'];
  return [undefined, undefined];
}
postHooks18().push((s, key, amount, cat) => onCost18(s, key, amount, cat));
export function onCost18(s: GameState, key: string, amount: number, cat: string): void {
  if (amount >= 0 || (cat !== 'marketing' && cat !== 'live_costs')) return;
  const [actId, kind] = actOfKey(s, key);
  const act = actId ? s.acts[actId] : undefined;
  const c = act?.contractId ? s.contracts[act.contractId] : undefined;
  if (!c || !kind || !clausesOf(c)) return;
  addRecoup18(s, c, kind, -amount);
}

/** confiança anda devagar conforme a justiça percebida das cláusulas (só quem tem assessoria percebe tudo) */
function fairness18(s: GameState, act: Act, c: C18): number {
  const k = c.clauses18;
  if (!k) return 0;
  const w = reason18(s, act, { ...c, promises: [], clauses18: k } as unknown as OfferLike);
  return clamp(w.reduce((t, x) => t + x.d, 0) * 8, -1, 1);
}

function monthly(s: GameState): void {
  const st = st18(s);
  const f = fin18(s);
  const r = new Rng(seedState(`c18|${s.config.seed}|${s.year}|${s.month}`));
  for (const act of Object.values(s.acts)) {
    if (act.owner !== 'player' || act.playerBand || !act.contractId || act.status === 'retired' || act.status === 'split') continue;
    const c = s.contracts[act.contractId] as C18 | undefined;
    if (!c || c.party !== 'player') continue;
    const k = c.clauses18;
    // ambição e confiança executam o contrato: cláusulas duras corroem quem tem assessoria, justas fidelizam
    if (k) act.trust = clamp(act.trust + fairness18(s, act, c) * 0.25 * (advisor18(s, act) ? 1 : 0.4), 0, 100);
    // engavetar: sem lançar há muito tempo
    const last = st.last[act.id] ?? c.startWeek;
    const idle = (s.week - last) / 4.35;
    if (idle > 18 && act.status !== 'hiatus') {
      act.trust = clamp(act.trust - (k?.minRel ? 3 : 1.5), 0, 100);
      if (idle > 24 && (st.shelf[act.id] ?? 0) < s.week - 52) {
        st.shelf[act.id] = s.week;
        emitEvent18(s, r, 'c18_shelved', { act: act.id });
      }
    }
    // fim de contrato com lançamento garantido não cumprido: processo por quebra
    if (k?.minRel && c.endWeek - s.week <= 4 && c.endWeek - s.week > 0 && c.releasesDone < k.minRel && !(st.shelf[`br:${c.id}`])) {
      st.shelf[`br:${c.id}`] = 1;
      fileLawsuit(s, { kind: 'contract', plaintiff: act.name, defendant: 'player', actId: act.id, claim: money(s, 15000 + act.fame * 600 + k.promo), odds: 0.3, text: fmtL(l('{a} processa: o contrato garantia {n} lançamento(s) e saiu(ram) {d}.', '{a} sues: the contract guaranteed {n} release(s) and only {d} came out.'), { a: act.name, n: k.minRel, d: c.releasesDone }) });
      remember(s, 'c18breach', fmtL(l('{a} vai à Justiça por lançamentos prometidos e não cumpridos.', '{a} takes the label to court over promised releases.'), { a: act.name }), { actId: act.id, important: true });
    }
  }
  // auditorias: uma vez por ano (em março), quem tem direito ou assessoria e motivo
  if (s.month === 2) {
    for (const act of Object.values(s.acts)) {
      if (act.owner !== 'player' || act.playerBand || !act.contractId) continue;
      const c = s.contracts[act.contractId] as C18 | undefined;
      const k = c?.clauses18;
      if (!c || !k) continue;
      const adv = advisor18(s, act);
      if (!k.audit && !adv) continue;
      const late = f.late[act.id] ?? 0;
      const pack = s.year >= 2008 && k.base !== 'net' ? 1 : 0;
      const amb = mainAmbition(s, act);
      const p = 0.02 + late * 0.05 + pack * 0.05 * adv + (act.trust < 35 ? 0.05 : 0) + (amb === 'money' ? 0.03 : 0);
      if (!r.chance(Math.min(0.4, p))) continue;
      st.audits += 1;
      const paid = Math.max(0, -(s.player.totals.royalties ?? 0)) / Math.max(1, Object.keys(s.contracts).length);
      const found = Math.round(paid * (0.02 * late + 0.06 * pack) + (late ? money(s, 1500 * late) : 0));
      if (found > money(s, 3000)) {
        fileLawsuit(s, { kind: 'audit', plaintiff: act.name, defendant: 'player', actId: act.id, claim: found, odds: 0.35 + (late ? 0 : 0.15), text: fmtL(l('Auditoria de {a} aponta royalties pagos a menos ({w}).', '{a}\'s audit finds underpaid royalties ({w}).'), { a: act.name, w: late ? l('prestações atrasadas', 'late statements') : l('dedução de embalagem no digital', 'packaging deduction on digital') }) });
        act.trust = clamp(act.trust - 6, 0, 100);
      } else {
        act.trust = clamp(act.trust + 5, 0, 100);
        post(s, `c18audit:${act.id}:${s.year}`, -money(s, 1200), 'legal', `Auditoria de ${act.name} (livros limpos)`);
        notify(s, fmtL(l('Auditoria de {a}: livros limpos. A confiança sobe.', '{a}\'s audit: clean books. Trust rises.'), { a: act.name }), 'good');
      }
    }
  }
}
registerSimHook('month', 'contracts18', (s) => monthly(s));

// evento: artista engavetado
function emitEvent18(s: GameState, r: Rng, id: string, ctx: Record<string, string>): void { emitEvent(s, r, id, ctx); }
const act_ = (s: GameState, c: Record<string, unknown>): Act | undefined => s.acts[String(c.act)];
deferEvents<EventDef>([
  {
    id: 'c18_shelved', cat: 'business', tone: 'bad', tags: [], cooldown: 0, forcedOnly: true,
    title: l('{act} se sente engavetado', '{act} feels shelved'),
    text: l('Faz mais de dois anos que {act} não lança nada pelo selo. O empresário fala em "liberação do contrato" e a imprensa já pergunta.', 'It has been over two years since {act} released anything with the label. Their manager talks about a "release from contract" and the press is asking.'),
    options: [
      { id: 'promise', label: l('Prometer um disco em 6 meses (vira cláusula)', 'Promise a record within 6 months (becomes a clause)'), hint: l('Confiança volta um pouco; se não cumprir, vira processo.', 'Trust recovers a bit; breaking it means a lawsuit.'), apply: (s, _r, c) => { const a = act_(s, c); const k = a?.contractId ? s.contracts[a.contractId] as C18 : undefined; if (!a || !k) return; a.trust = clamp(a.trust + 8, 0, 100); k.promises.push({ kind: 'priority', dueWeek: s.week + 26 }); if (k.clauses18) k.clauses18.minRel = Math.max(k.clauses18.minRel, k.releasesDone + 1); } },
      { id: 'free', label: l('Liberar do contrato (fica com os masters)', 'Release them (keep the masters)'), hint: l('Perde o artista; reputação com artistas sobe.', 'Lose the act; reputation with artists rises.'), apply: (s, _r, c) => { const a = act_(s, c); const k = a?.contractId ? s.contracts[a.contractId] : undefined; if (!a || !k) return; k.endWeek = s.week; s.player.reputation.artists = clamp(s.player.reputation.artists + 3, 0, 100); remember(s, 'c18free', fmtL(l('O selo libera {a} do contrato depois de anos na gaveta.', 'The label releases {a} from their contract after years on the shelf.'), { a: a.name }), { actId: a.id }); } },
      { id: 'hold', label: l('Segurar o contrato', 'Hold them to the contract'), hint: l('Confiança despenca; imprensa fala em "artista refém".', 'Trust collapses; the press talks of a "hostage artist".'), apply: (s, _r, c) => { const a = act_(s, c); if (!a) return; a.trust = clamp(a.trust - 15, 0, 100); s.player.reputation.artists = clamp(s.player.reputation.artists - 4, 0, 100); notify(s, fmtL(l('Imprensa: "{a}, refém da gravadora".', 'Press: "{a}, held hostage by their label".'), { a: a.name }), 'bad'); } },
    ],
  },
]);
