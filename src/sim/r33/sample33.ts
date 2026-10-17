// R33 · CATÁLOGO — SAMPLING E REGRAVAÇÃO DO SEU CATÁLOGO POR OUTROS (`exp33.sampling`, desligado).
// O lado de dentro (você sampleia/regrava obra alheia) já existe em sys/rights18 (autorizações e caução). Aqui é o lado
// de fora: artistas de outros selos pedem para samplear (1979+) ou regravar uma faixa sua.
//  • Liberar: cachê agora + o master antigo ganha fôlego por 6 meses (quem ouve o sample procura o original) + a obra
//    entra na cadeia de royalties (r33/chain33: a versão alheia paga a sua editora).
//  • Negar: sem dinheiro; às vezes o artista usa assim mesmo → PROCESSO. O processo fica aberto para o cartório/tribunal
//    (INT-2) chamar `resolveCase33` (acordo, tribunal ou desistir). Ninguém chamou em 26 semanas → acordo fora do
//    tribunal automático (60% do valor em jogo).
//  • Pedido sem resposta até o prazo conta como negado.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import type { GameState, Release } from '../types';
import { fmtL, money, post, staffSkill } from '../util';
import { releasesNow27 } from '../tickcache27';
import { cat33, id33, log33, on33, peek33, rng33, type Case33, type Req33 } from './cat33';

const ON = 'exp33.sampling' as const;
export const REQ_P33 = 0.06;
export const REQ_WEEKS33 = 8;
export const BOOST33 = 1.15;
export const BOOST_WEEKS33 = 26;
export const CASE_AUTO_WEEKS33 = 26;

const actName = (s: GameState, id: string): string => s.acts[id]?.name ?? '?';

export const openReqs33 = (s: GameState): Req33[] => (peek33(s)?.req ?? []).filter((x) => x.st === 'open' && x.until >= s.week);
export const openCases33 = (s: GameState): Case33[] => (peek33(s)?.cases ?? []).filter((x) => x.st === 'open');

function candidates(s: GameState): Release[] {
  return releasesNow27(s).filter((r) => r.owner === 'player' && s.year - r.year >= 3 && r.totalUnits >= 20000 && !r.reissueOf);
}

function makeReq(s: GameState): void {
  const r = rng33(s, 'samp');
  if (!r.chance(REQ_P33)) return;
  const rels = candidates(s);
  if (!rels.length) return;
  const tot = rels.reduce((t, x) => t + x.totalUnits, 0);
  let k = r.next() * tot, rel = rels[0];
  for (const x of rels) { k -= x.totalUnits; if (k <= 0) { rel = x; break; } }
  const sid = rel.songs.find((id) => { const so = s.songs[id]; return so && !so.coverOf && !so.sampleOf; });
  if (!sid) return;
  const by = Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand && a.status !== 'retired' && a.status !== 'split' && !a.deceased && a.fame >= 20);
  if (!by.length) return;
  const a = r.pick(by);
  const st = cat33(s);
  if (st.req.some((x) => x.song === sid && x.st === 'open')) return;
  const kind: Req33['kind'] = s.year >= 1979 && r.chance(0.6) ? 'sample' : 'cover';
  const fee = money(s, Math.round(clamp(400 + rel.totalUnits * 0.01, 400, 9000) * (kind === 'sample' ? 1 : 0.7)));
  const q: Req33 = { id: id33(st, 'smq'), kind, song: sid, rel: rel.id, by: a.id, fee, until: s.week + REQ_WEEKS33, st: 'open' };
  st.req.push(q);
  if (st.req.length > 40) st.req.splice(0, st.req.length - 40);
  const t = s.songs[sid]?.title ?? '?';
  emitFact(s, { kind: 'deal', actors: [a.id, 'player'], severity: 20, visibility: 'rumor', tags: ['sample33', kind], src: 'sample33', data: { req: q.id },
    text: fmtL(kind === 'sample' ? l('{a} quer samplear "{t}" e oferece {f}.', '{a} wants to sample "{t}" and offers {f}.') : l('{a} quer regravar "{t}" e oferece {f}.', '{a} wants to cover "{t}" and offers {f}.'), { a: a.name, t, f: Math.round(fee / 100) }),
    notify: { kind: 'event', cat: 'rights' } });
}

/** Resposta do jogador (cartão de ações da obra / caixa de entrada). */
export function answerReq33(s: GameState, id: string, ok: boolean): L {
  const st = peek33(s), q = st?.req.find((x) => x.id === id && x.st === 'open');
  if (!st || !q) return l('Pedido não encontrado.', 'Request not found.');
  const t = s.songs[q.song]?.title ?? '?';
  if (ok) {
    q.st = 'ok';
    post(s, `smp33:${q.id}`, q.fee, 'rights', `Liberação de ${q.kind === 'sample' ? 'sample' : 'regravação'} "${t}"`);
    st.boost[q.rel] = s.week + BOOST_WEEKS33;
    st.lic.push({ song: q.song, by: q.by, kind: q.kind, share: q.kind === 'sample' ? 0.25 : 1, until: s.week + 104 });
    if (st.lic.length > 40) st.lic.splice(0, st.lic.length - 40);
    const tx = fmtL(l('Você libera "{t}" para {a}: o cachê entra e o original volta a ser procurado.', 'You clear "{t}" for {a}: the fee comes in and the original is sought again.'), { t, a: actName(s, q.by) });
    log33(s, tx);
    return tx;
  }
  deny(s, q);
  return fmtL(l('Você nega "{t}" a {a}.', 'You refuse "{t}" to {a}.'), { t, a: actName(s, q.by) });
}

function deny(s: GameState, q: Req33): void {
  const st = cat33(s), r = rng33(s, `deny:${q.id}`);
  q.st = 'denied';
  const fame = s.acts[q.by]?.fame ?? 0;
  if (!r.chance(fame >= 60 ? 0.45 : 0.35)) return;
  const c: Case33 = { id: id33(st, 'cs'), kind: q.kind, song: q.song, vs: q.by, stake: q.fee * 3, since: s.week, st: 'open' };
  st.cases.push(c);
  if (st.cases.length > 30) st.cases.splice(0, st.cases.length - 30);
  const tx = fmtL(l('{a} usou "{t}" mesmo sem autorização: o selo abre processo.', '{a} used "{t}" without clearance: the label files a lawsuit.'), { a: actName(s, q.by), t: s.songs[q.song]?.title ?? '?' });
  emitFact(s, { kind: 'case_ruling', actors: ['player', q.by], severity: 35, visibility: 'public', tags: ['sample33', 'law', 'open'], src: 'sample33', data: { case: c.id }, text: tx, notify: 'event' });
  log33(s, tx);
}

/** Chance de ganhar no tribunal (equipe jurídica ajuda). */
export const caseOdds33 = (s: GameState): number => clamp(0.55 + staffSkill(s, 'legal') / 400, 0.3, 0.85);

/** GANCHO DO CARTÓRIO/TRIBUNAL (INT-2): resolve o processo. settle = acordo (60% já); court = tribunal (ganha 150% ou
 *  paga as custas); drop = desiste. Devolve o texto do resultado. */
export function resolveCase33(s: GameState, id: string, how: 'settle' | 'court' | 'drop'): L {
  const c = openCases33(s).find((x) => x.id === id);
  if (!c) return l('Processo não encontrado.', 'Case not found.');
  const t = s.songs[c.song]?.title ?? '?', a = actName(s, c.vs);
  let tx: L;
  if (how === 'drop') { c.st = 'dropped'; tx = fmtL(l('O selo desiste do processo contra {a} por "{t}".', 'The label drops the case against {a} over "{t}".'), { a, t }); }
  else if (how === 'settle') {
    c.st = 'settled';
    post(s, `case33:${c.id}`, Math.round(c.stake * 0.6), 'legal', `Acordo: "${t}"`);
    tx = fmtL(l('Acordo com {a} por "{t}": o selo recebe {v}.', 'Settlement with {a} over "{t}": the label receives {v}.'), { a, t, v: Math.round(c.stake * 0.006) });
  } else {
    const win = rng33(s, `court:${c.id}`).chance(caseOdds33(s));
    c.st = win ? 'won' : 'lost';
    if (win) post(s, `case33:${c.id}`, Math.round(c.stake * 1.5), 'legal', `Vitória no tribunal: "${t}"`);
    else post(s, `case33:${c.id}`, -money(s, 3000), 'legal', `Custas do processo: "${t}"`);
    tx = fmtL(win ? l('Tribunal dá ganho de causa ao selo contra {a} por "{t}".', 'The court rules for the label against {a} over "{t}".') : l('Tribunal dá razão a {a} no caso "{t}"; o selo paga as custas.', 'The court sides with {a} on "{t}"; the label pays the costs.'), { a, t });
    emitFact(s, { kind: 'case_ruling', actors: ['player', c.vs], severity: 40, visibility: 'public', tags: ['sample33', 'law', win ? 'good' : 'bad'], src: 'sample33', data: { case: c.id }, text: tx, notify: win ? 'good' : 'bad' });
  }
  c.res = tx;
  log33(s, tx);
  return tx;
}

registerSimHook('month', 'sample33', (s) => {
  if (!on33(s, ON)) return;
  const st = peek33(s);
  if (st) {
    for (const q of st.req) if (q.st === 'open' && q.until < s.week) deny(s, q);
    for (const c of openCases33(s)) if (s.week - c.since >= CASE_AUTO_WEEKS33) resolveCase33(s, c.id, 'settle');
    for (const [k, w] of Object.entries(st.boost)) if (w < s.week) delete st.boost[k];
  }
  makeReq(s);
});

registerMod('chartUnits', 'sample33', (s, v, { release }) => {
  if (!release || !on33(s, ON)) return null;
  const w = peek33(s)?.boost[release.id];
  return w && w >= s.week ? { value: v * BOOST33, label: l('Sampleado por outro artista', 'Sampled by another artist') } : null;
});
