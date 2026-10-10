// Rodada 18 (art18, item 5) — TRAJETÓRIA ARTÍSTICA. Cada disco muda o próximo. A partir do que já existe (som e
// assinatura de sound.ts, temas da criação, fatos da vida em facts17, história cult de stories8, crítica, vendas
// contra a previsão), cada artista do jogador acumula: desejo de experimentar × pressão para repetir o hit,
// expectativa do público e da crítica, confiança, reputação de palco (shows) separada da de estúdio (crítica),
// temas recorrentes nas letras (os vividos — luto, amor, prisão, vício — pesam na emoção) e eras da carreira.
// Dez semanas depois de cada lançamento o resultado vira reação, decidida pelos traços (soul9) do líder:
//   estreia cultuada → expectativa sufocante (o próximo é comparado com ela pela crítica);
//   sucesso inesperado → pressão pela fórmula e tensão na banda (créditos do hit: ressentimento, vontade de solo);
//   fracasso → reinvenção (curioso/corajoso), conservadorismo (teimoso/tradicional) ou perda de confiança (ansioso),
//   e quem dava valor pessoal ao disco o defende. O jogador responde pela caixa de entrada (com efeitos à vista).
// Os efeitos entram nas dimensões de qualidade (quality18), no apelo, na crítica, na gravação e nos shows.

import { Rng, clamp, seedState } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExplain } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact, recentFacts, type Fact } from '../facts17';
import { histMode } from '../history15';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { registerReviewAdjust } from '../media';
import { addStress } from '../stress17';
import { realKey18 } from './personact18';
import type { Act, GameState, Person, Release } from '../types';
import { fmtL, notify, playerActs, post, remember } from '../util';
import { songTheme, themeById } from './creation/core';
import { capDeltas, songRec, syncSong, type Deltas } from './music/state';
import { openProjects } from './project8';
import { proj12, projectOfRelease, type Dir } from './project12';
import { DIM18, chemistry18, mainProducer18, mine18, prodDef18, registerDimAdj18, type DimAdj18 } from './quality18';
import { actSignature, actTrademarks, dist, releaseSound, soundTags } from './sound';
import { soul } from './soul9';
import { activeStory } from './stories8';

export type Out18 = 'cult' | 'hit' | 'flop' | 'proud' | 'solid';
export type React18 = 'reinvent' | 'conserv' | 'shaken' | 'proud';
export type EraK18 = 'debut' | 'cult' | 'hit' | 'reinvent' | 'conserv' | 'shaken' | 'shift' | 'producer' | 'lineup' | 'proud';
export interface Era18 { y: number; m: number; k: EraK18; rel?: string; t: L }
export interface T18 {
  exp: number; pres: number; expect: number; conf: number; stage: number; studio: number; shows: number;
  th: Record<string, number>; eras: Era18[]; out: Record<string, Out18>; pend: string[]; n: number;
  react?: React18; line?: 'formula' | 'free' | 'calm' | 'ride'; prod?: string; prodN?: number;
}
export interface Traj18State { a: Record<string, T18> }
declare module '../ext4' { interface Ext4 { traj18: Traj18State } }
registerExt4('traj18', () => ({ a: {} }));
const ts = (s: GameState): Traj18State => ((s as unknown as { x4: { traj18?: Traj18State } }).x4.traj18 ??= { a: {} });
export const traj18 = (s: GameState, actId: string): T18 | undefined => ts(s).a[actId];

export const OUT18: Record<Out18, L> = {
  cult: l('Cultuado: crítica alta, venda baixa', 'Cult: high praise, low sales'), hit: l('Sucesso acima do esperado', 'Bigger hit than expected'),
  flop: l('Fracasso comercial', 'Commercial flop'), proud: l('Fracasso que o artista defende', 'A flop the artist stands by'), solid: l('Dentro do esperado', 'As expected'),
};
export const REACT18: Record<React18, { name: L; fx: L }> = {
  reinvent: { name: l('Reinvenção', 'Reinvention'), fx: l('Quer mudar tudo: originalidade +6 no próximo disco, desejo de experimentar alto.', 'Wants to change everything: originality +6 on the next record, high urge to experiment.') },
  conserv: { name: l('Conservadorismo', 'Playing it safe'), fx: l('Volta ao som conhecido: acessibilidade +5, originalidade −5 no próximo disco.', 'Back to the familiar sound: accessibility +5, originality −5 on the next record.') },
  shaken: { name: l('Perda de confiança', 'Lost confidence'), fx: l('Inseguro no estúdio: emoção −5 e performance −3 até recuperar a confiança.', 'Insecure in the studio: emotion −5 and performance −3 until confidence returns.') },
  proud: { name: l('Defende o disco', 'Stands by the record'), fx: l('Valor pessoal acima da venda: confiança preservada, emoção +3 no próximo.', 'Personal value over sales: confidence kept, emotion +3 on the next.') },
};
export const ERA18: Record<EraK18, L> = {
  debut: l('Estreia', 'Debut'), cult: l('Culto', 'Cult'), hit: l('Estouro', 'Breakthrough'), reinvent: l('Reinvenção', 'Reinvention'), conserv: l('Volta às raízes', 'Back to basics'),
  shaken: l('Crise de confiança', 'Crisis of confidence'), shift: l('Virada sonora', 'Sound shift'), producer: l('Nova parceria', 'New partnership'), lineup: l('Nova formação', 'New lineup'), proud: l('Obra pessoal', 'Personal work'),
};
const LIVED_NAME: Record<string, L> = { demons: l('Demônios internos', 'Inner demons') };
export const themeName18 = (id: string): L => themeById[id]?.name ?? LIVED_NAME[id] ?? l(id);

const leader = (s: GameState, act: Act): Person | undefined => s.persons[act.leaderId ?? act.members[0]];
const eligible = (rel: Release) => !rel.reissueOf && !rel.hist && (!rel.kind || rel.kind === 'standard' || rel.kind === 'limited' || rel.kind === 'posthumous');
const isMine = (s: GameState, act: Act) => act.owner === 'player' || !!act.playerBand;

/** Desejo de experimentar de base (curiosidade, rebeldia, coragem − teimosia do líder). */
export function baseExp18(s: GameState, act: Act): number {
  const p = leader(s, act);
  if (!p) return 50;
  const f = soul(s, p).f;
  return Math.round(clamp(f.curiosidade * 0.45 + f.rebeldia * 0.25 + f.coragem * 0.2 + (100 - f.teimosia) * 0.1, 5, 95));
}
const baseConf = (s: GameState, act: Act) => { const p = leader(s, act); return p ? Math.round(clamp(45 + (soul(s, p).f.confianca - 50) * 0.5, 20, 80)) : 55; };
const baseExpect = (act: Act) => Math.round(clamp(act.fame * 0.45, 0, 60));

export function ensureT18(s: GameState, act: Act): T18 {
  return (ts(s).a[act.id] ??= { exp: baseExp18(s, act), pres: 15, expect: baseExpect(act), conf: baseConf(s, act), stage: 50, studio: 50, shows: 0, th: {}, eras: [], out: {}, pend: [], n: 0 });
}
function era(s: GameState, t: T18, k: EraK18, t0: L, rel?: string): void {
  const last = t.eras[t.eras.length - 1];
  if (last && last.k === k && last.y === s.year) return;
  t.eras.push({ y: s.year, m: s.month, k, rel, t: t0 });
  if (t.eras.length > 16) t.eras.splice(1, 1);
}

// ------------------------------------------------------------------ temas vividos (fatos da vida → letras)

const FACT_THEME: Record<string, string> = {
  death: 'longing', romance: 'love', marriage: 'love', birth: 'love', breakup: 'heartbreak', affair: 'heartbreak', split: 'heartbreak', exit: 'heartbreak',
  arrest: 'rebellion', scandal: 'rebellion', case_ruling: 'rebellion', addiction: 'demons', rehab: 'demons', breakdown: 'demons', health: 'demons',
  chart: 'money', award: 'money', boycott: 'protest', law: 'protest', statement: 'protest', tour_cancel: 'road',
};
/** Temas que a vida do artista deu nos últimos 2 anos (de fatos públicos/rumores sobre o ato e os integrantes). */
export function livedThemes18(s: GameState, act: Act): { id: string; f: Fact }[] {
  const ids = new Set([act.id, ...act.members]);
  const out: { id: string; f: Fact }[] = [];
  const seen = new Set<string>();
  for (const f of recentFacts(s, { months: 24, notSecret: true })) {
    const th = FACT_THEME[f.kind];
    if (!th || seen.has(th) || f.severity < 25 || !f.actors.some((x) => ids.has(x))) continue;
    seen.add(th);
    out.push({ id: th, f });
    if (out.length >= 3) break;
  }
  return out;
}

// ------------------------------------------------------------------ dimensões: o que a trajetória soma

const DIR_OF = (s: GameState, rel: Release): Dir | undefined => projectOfRelease(s, rel)?.pl.dir;
registerDimAdj18('traj18', (s, rel, act) => {
  if (!mine18(s, rel)) return [];
  const t = ensureT18(s, act);
  const out: DimAdj18[] = [];
  const c = Math.round(clamp((t.conf - 55) / 6, -6, 5));
  if (c) out.push({ d: 'emo', v: c, why: fmtL(l('Confiança do artista ({c})', 'Artist confidence ({c})'), { c: Math.round(t.conf) }) });
  const dir = DIR_OF(s, rel);
  if (dir === 'safe' && t.exp > 65) out.push({ d: 'emo', v: -6, why: l('Queria arriscar e gravou no seguro: fez no automático', 'Wanted to take risks but played safe: went through the motions') });
  if (dir === 'bold' && t.exp >= 60) out.push({ d: 'emo', v: 5, why: l('Liberdade para experimentar: gravou com tesão', 'Free to experiment: recorded with fire') });
  if (dir === 'bold' && t.exp < 35) out.push({ d: 'emo', v: -4, why: l('Não acreditava na aposta', 'Did not believe in the gamble') });
  if (t.react === 'reinvent') out.push({ d: 'orig', v: 6, why: l('Reação ao fracasso: reinvenção', 'Reaction to the flop: reinvention') });
  if (t.react === 'conserv') { out.push({ d: 'acc', v: 5, why: l('Reação ao fracasso: voltar ao seguro', 'Reaction to the flop: back to safe') }); out.push({ d: 'orig', v: -5, why: l('Reação ao fracasso: voltar ao seguro', 'Reaction to the flop: back to safe') }); }
  if (t.react === 'shaken') out.push({ d: 'emo', v: -5, why: l('Abalado pelo fracasso anterior', 'Shaken by the previous flop') });
  if (t.react === 'proud') out.push({ d: 'emo', v: 3, why: l('Defendeu o disco anterior: segue fiel a si', 'Stood by the last record: true to self') });
  // temas recorrentes e vividos
  const lived = new Set(livedThemes18(s, act).map((x) => x.id));
  const songs = rel.songs.map((id) => s.songs[id]).filter(Boolean);
  const hits = songs.filter((so) => { const th = songTheme(s, so); return th && lived.has(th); }).length;
  if (lived.size) {
    const v = hits ? Math.min(7, 2 + hits * 2) : lived.has('demons') || lived.has('longing') ? 3 : 0;
    if (v) out.push({ d: 'emo', v, why: hits ? fmtL(l('Canta o que viveu ({n} faixa(s) sobre a própria vida)', 'Sings what they lived ({n} track(s) about their own life)'), { n: hits }) : l('A fase difícil transparece na voz', 'The hard times show in the voice') });
  }
  const top = Object.entries(t.th).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 2 && songs.some((so) => songTheme(s, so) === top[0])) out.push({ d: 'dur', v: 3, why: fmtL(l('Tema recorrente da obra ({t}): identidade', 'Recurring theme of the work ({t}): identity'), { t: themeName18(top[0]) }) });
  return out;
});

// ------------------------------------------------------------------ lançamento

registerSimHook('launch', 'traj18', (s, _r, a) => {
  const rel = a.release;
  const act = rel && s.acts[rel.actId];
  if (!rel || !act || !isMine(s, act) || !eligible(rel)) return;
  const t = ensureT18(s, act);
  t.n += 1;
  if (t.n === 1) era(s, t, 'debut', fmtL(l('Estreia com "{r}".', 'Debut with "{r}".'), { r: rel.title }), rel.id);
  // som: virada brusca em relação à assinatura até aqui
  const sig = actSignature(s, act);
  const v = releaseSound(s, rel);
  if (sig && v && sig.n >= 3 && sig.last && dist(v, sig.last) > 22) era(s, t, 'shift', fmtL(l('"{r}" muda o som: {t}.', '"{r}" changes the sound: {t}.'), { r: rel.title, t: soundTags(v).map((x) => x.pt).join(', ') || '—' }), rel.id);
  // parceria com produtor
  const pid = mainProducer18(s, rel);
  if (pid && pid !== t.prod) {
    if (t.prod && (t.prodN ?? 0) >= 2) era(s, t, 'producer', fmtL(l('Troca de produtor: {p}.', 'New producer: {p}.'), { p: prodDef18(pid)?.name ?? pid }), rel.id);
    t.prod = pid; t.prodN = 1;
  } else if (pid) t.prodN = (t.prodN ?? 0) + 1;
  // temas (das faixas e da vida)
  for (const id of rel.songs) { const th = s.songs[id] && songTheme(s, s.songs[id]); if (th) t.th[th] = (t.th[th] ?? 0) + 1; }
  for (const x of livedThemes18(s, act)) t.th[x.id] = (t.th[x.id] ?? 0) + 1;
  if (t.expect >= 65 && act.owner === 'player') remember(s, 'traj18', fmtL(l('"{r}" chega sob expectativa enorme: crítica e fãs vão comparar com o que {a} já fez.', '"{r}" arrives under huge expectations: critics and fans will compare it with {a}\'s past.'), { r: rel.title, a: act.name }), { actId: act.id });
  t.react = undefined; // a reação valeu para este disco
  t.line = t.line === 'calm' || t.line === 'ride' ? undefined : t.line;
  t.pend.push(rel.id);
});

// ------------------------------------------------------------------ mês: expectativa esfria, resultados viram reação

const W_EVAL = 10;
registerSimHook('month', 'traj18', (s) => {
  const st = ts(s);
  for (const [id, t] of Object.entries(st.a)) {
    const act = s.acts[id];
    if (!act || act.status === 'retired' || act.deceased) { if (!act) delete st.a[id]; continue; }
    t.expect += (baseExpect(act) - t.expect) * 0.04;
    t.pres = Math.max(0, t.pres - 1.5);
    t.exp += (baseExp18(s, act) - t.exp) * 0.03;
    t.conf += (baseConf(s, act) - t.conf) * 0.05;
    for (const rid of t.pend.slice()) {
      const rel = s.releases[rid];
      if (!rel) { t.pend = t.pend.filter((x) => x !== rid); continue; }
      if (s.week - rel.week < W_EVAL) continue;
      t.pend = t.pend.filter((x) => x !== rid);
      evaluate(s, act, t, rel);
    }
  }
});

export function outcome18(s: GameState, rel: Release): { o: Out18; ratio: number; critic: number } {
  const actual = rel.fa ?? rel.totalUnits;
  const ratio = rel.fc && rel.fc > 0 ? actual / rel.fc : 1;
  const critic = rel.critic ?? 60;
  let o: Out18 = 'solid';
  if (critic >= 72 && ratio < 0.9) o = 'cult';
  else if (ratio >= 1.8 || (rel.peak <= 10 && ratio >= 1.25)) o = 'hit';
  else if (ratio < 0.55 && critic < 72) o = 'flop';
  return { o, ratio, critic };
}

/** Reação ao fracasso pelos traços do líder (e se o disco tinha valor pessoal). */
export function flopReaction18(s: GameState, act: Act, critic: number, r: Rng): { k: React18; why: L } {
  const p = leader(s, act);
  if (!p) return { k: 'conserv', why: l('Sem líder: o selo decide pelo seguro.', 'No leader: the label goes safe.') };
  const so = soul(s, p);
  const f = so.f;
  if ((so.v.arte >= 65 && critic >= 58) || critic >= 66) return { k: 'proud', why: fmtL(l('{p} valoriza a arte acima da venda (arte {a}) e a crítica gostou ({c}).', '{p} values art over sales (art {a}) and critics liked it ({c}).'), { p: p.name, a: so.v.arte, c: critic }) };
  const sc: [React18, number, L][] = [
    ['reinvent', f.curiosidade * 0.5 + f.coragem * 0.3 + f.rebeldia * 0.2, fmtL(l('{p} é curioso(a) e corajoso(a) (curiosidade {c}, coragem {g}).', '{p} is curious and brave (curiosity {c}, courage {g}).'), { p: p.name, c: f.curiosidade, g: f.coragem })],
    ['conserv', f.teimosia * 0.4 + (100 - f.curiosidade) * 0.4 + so.v.tradicao * 0.2, fmtL(l('{p} é teimoso(a) e tradicional (teimosia {t}, tradição {d}).', '{p} is stubborn and traditional (stubbornness {t}, tradition {d}).'), { p: p.name, t: f.teimosia, d: so.v.tradicao })],
    ['shaken', f.ansiedade * 0.5 + (100 - f.confianca) * 0.5, fmtL(l('{p} é ansioso(a) e inseguro(a) (ansiedade {a}, confiança {c}).', '{p} is anxious and insecure (anxiety {a}, confidence {c}).'), { p: p.name, a: f.ansiedade, c: f.confianca })],
  ];
  for (const x of sc) x[1] += r.normal(0, 6);
  sc.sort((a, b) => b[1] - a[1]);
  return { k: sc[0][0], why: sc[0][2] };
}

const realLocked = (s: GameState, p: Person) => histMode(s) === 'strict' && realKey18(s, `p:${p.id}`);

function evaluate(s: GameState, act: Act, t: T18, rel: Release): void {
  const r = new Rng(seedState(`${s.config.seed}:traj18:${rel.id}`));
  const { o, ratio, critic } = outcome18(s, rel);
  const first = Object.keys(t.out).length === 0;
  t.studio = clamp(t.studio + (critic - t.studio) * 0.35, 0, 100);
  if (rel.q > 0) t.expect = clamp(t.expect + (rel.q - 55) * 0.15, 0, 100);
  const mine = act.owner === 'player';
  const pct = Math.round(ratio * 100);
  let text: L | null = null;
  let res: Out18 = o;
  if (o === 'cult') {
    t.expect = clamp(t.expect + (first ? 30 : 15), 0, 100);
    t.exp = clamp(t.exp + 8, 0, 100);
    era(s, t, 'cult', fmtL(first ? l('Estreia cultuada: "{r}" (crítica {c}).', 'Cult debut: "{r}" (critics {c}).') : l('"{r}" vira disco de culto (crítica {c}).', '"{r}" becomes a cult record (critics {c}).'), { r: rel.title, c: critic }), rel.id);
    const p = leader(s, act);
    if (p && first) addStress(s, p.id, 8, l('Expectativa sufocante depois da estreia cultuada', 'Suffocating expectations after a cult debut'));
    text = fmtL(first ? l('A estreia de {a} virou culto: crítica {c}, vendas em {p}% do previsto. O próximo disco vai ser comparado com ela — a expectativa sobe a {e}.', '{a}\'s debut became a cult record: critics {c}, sales at {p}% of forecast. The next record will be measured against it — expectations rise to {e}.') : l('"{r}" de {a}: crítica {c}, vendas em {p}% do previsto. Cult.', '{a}\'s "{r}": critics {c}, sales at {p}% of forecast. Cult.'), { a: act.name, r: rel.title, c: critic, p: pct, e: Math.round(t.expect) });
    if (mine && first) pushInbox18(s, 'traj18', { from: act.name, subject: l('Estreia cultuada: e agora?', 'Cult debut: what now?'), body: text, ref: { act: act.id, o: 'cult' }, tone: 'good',
      actions: [{ id: 'calm', label: l('Proteger: tempo e prazo folgado (expectativa −15, confiança +10)', 'Protect: time and a relaxed deadline (expectations −15, confidence +10)') }, { id: 'ride', label: l('Aproveitar o burburinho (apelo do próximo sobe com a expectativa; crítica cobra mais)', 'Ride the buzz (next record\'s appeal rises with expectations; critics demand more)') }] });
  } else if (o === 'hit') {
    t.pres = clamp(t.pres + 25, 0, 100);
    t.expect = clamp(t.expect + 15, 0, 100);
    t.conf = clamp(t.conf + 10, 0, 100);
    era(s, t, 'hit', fmtL(l('"{r}" estoura ({p}% do previsto).', '"{r}" breaks out ({p}% of forecast).'), { r: rel.title, p: pct }), rel.id);
    const tension = hitTension(s, act, rel);
    const base = fmtL(l('"{r}" vendeu {p}% do previsto. Os fãs novos querem mais do mesmo (pressão pela fórmula {f}).', '"{r}" sold {p}% of forecast. New fans want more of the same (pressure for the formula {f}).'), { r: rel.title, p: pct, f: Math.round(t.pres) });
    text = tension ? l(`${base.pt} ${tension.pt}`, `${base.en} ${tension.en}`) : base;
    if (mine) pushInbox18(s, 'traj18', { from: act.name, subject: fmtL(l('{a}: repetir a fórmula?', '{a}: repeat the formula?'), { a: act.name }), body: text, ref: { act: act.id, o: 'hit', rel: rel.id }, tone: 'good',
      actions: [
        ...(act.members.length > 1 ? [{ id: 'share', label: l('Dividir o bolo do hit com a banda (2% da receita do disco; ressentimento −15)', 'Share the hit money with the band (2% of the record\'s revenue; resentment −15)') }] : []),
        { id: 'formula', label: l('Pedir a mesma fórmula (apelo ×1,05 se o som for parecido; quem quer experimentar perde moral)', 'Ask for the same formula (appeal ×1.05 if the sound is close; experimenters lose morale)') },
        { id: 'free', label: l('Deixar o artista seguir o próprio caminho (confiança +6)', 'Let the artist follow their path (trust +6)') }] });
  } else if (o === 'flop') {
    const rc = flopReaction18(s, act, critic, r);
    t.react = rc.k;
    if (rc.k === 'proud') res = 'proud';
    if (rc.k === 'reinvent') { t.exp = clamp(t.exp + 30, 0, 100); t.pres = Math.max(0, t.pres - 10); }
    if (rc.k === 'conserv') { t.exp = clamp(t.exp - 25, 0, 100); t.pres = clamp(t.pres + 10, 0, 100); }
    if (rc.k === 'shaken') { t.conf = clamp(t.conf - 25, 0, 100); const p = leader(s, act); if (p) addStress(s, p.id, 10, l('O disco fracassou', 'The record flopped')); }
    if (rc.k === 'proud') t.conf = clamp(t.conf - 3, 0, 100);
    t.expect = clamp(t.expect - 12, 0, 100);
    era(s, t, rc.k, fmtL(l('Depois de "{r}": {k}.', 'After "{r}": {k}.'), { r: rel.title, k: REACT18[rc.k].name }), rel.id);
    text = fmtL(l('"{r}" vendeu só {p}% do previsto (crítica {c}). Reação de {a}: {k}. {w} {fx}', '"{r}" sold only {p}% of forecast (critics {c}). {a}\'s reaction: {k}. {w} {fx}'), { r: rel.title, p: pct, c: critic, a: act.name, k: REACT18[rc.k].name, w: rc.why, fx: REACT18[rc.k].fx });
    if (mine) pushInbox18(s, 'traj18', { from: act.name, subject: fmtL(l('{a} depois do fracasso', '{a} after the flop'), { a: act.name }), body: text, ref: { act: act.id, o: 'flop' }, tone: 'bad',
      actions: [
        { id: 'push', label: rc.k === 'conserv' ? l('Pedir ousadia (inverte a reação; confiança −5, confiança no selo −6)', 'Push for boldness (flips the reaction; confidence −5, trust −6)') : l('Pedir o som de sempre (inverte a reação; confiança −5, confiança no selo −6)', 'Ask for the usual sound (flips the reaction; confidence −5, trust −6)') },
        { id: 'rest', label: l('Dar uma pausa de 3 meses (confiança +15, estresse aliviado; sem lançar)', 'Give a 3-month break (confidence +15, stress relieved; no releases)') },
        { id: 'back', label: l('Apoiar a reação do artista (confiança no selo +6)', 'Back the artist\'s reaction (trust +6)') }] });
  } else {
    t.conf = clamp(t.conf + 3, 0, 100);
  }
  t.out[rel.id] = res;
  if (res !== 'solid') {
    emitFact(s, { kind: 'art_turn', actors: [act.id], severity: res === 'hit' || res === 'cult' ? 45 : 35, visibility: 'public', tags: ['art18', res], text: text ?? OUT18[res], src: 'traj18', data: { rel: rel.id, ratio: Math.round(ratio * 100), critic } });
    if (text) remember(s, 'traj18', text, { actId: act.id, important: res === 'hit' || (res === 'cult' && first) });
    if (mine && text) notify(s, text, res === 'hit' || res === 'cult' ? 'good' : 'bad');
  }
}

/** Sucesso inesperado divide a banda: quem não assinou o hit se ressente; a voz ambiciosa pensa em solo. */
function hitTension(s: GameState, act: Act, rel: Release): L | null {
  if (act.members.length < 2) return null;
  const lead = s.songs[rel.songs[0]];
  const share = (pid: string) => lead?.splits?.find((x) => x.personId === pid)?.share ?? (lead?.writers.includes(pid) ? 1 / Math.max(1, lead.writers.length) : 0);
  const hurt: string[] = [];
  for (const pid of act.members) {
    const p = s.persons[pid];
    if (!p || !p.alive || realLocked(s, p)) continue;
    if (share(pid) < 0.2) { const so = soul(s, p).f; p.resentment = clamp(p.resentment + 8 + Math.round((so.ego + so.vaidade) / 20), 0, 100); hurt.push(p.name.split(' ')[0]); }
  }
  const ld = leader(s, act);
  let solo = false;
  if (ld && !realLocked(s, ld) && soul(s, ld).f.ambicao > 70 && !ld.goal) { ld.goal = 'solo'; solo = true; }
  if (!hurt.length && !solo) return null;
  return l(
    (hurt.length ? `Tensão na banda: ${hurt.join(', ')} não assinou o hit e se ressente.` : '') + (solo ? ` ${ld!.name} começa a pensar em carreira solo.` : ''),
    (hurt.length ? `Band tension: ${hurt.join(', ')} didn't write the hit and resents it.` : '') + (solo ? ` ${ld!.name} starts thinking about going solo.` : ''),
  );
}

registerInboxKind('traj18', {
  label: l('Trajetória do artista', 'Artist trajectory'), cat: 'decision', icon: 'disc', prio: 2,
  goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act), label: l('Abrir artista', 'Open act') } : null),
  handle: (s, m, action) => {
    const act = s.acts[String(m.ref?.act ?? '')];
    const t = act && traj18(s, act.id);
    if (!act || !t) return l('O artista já não está aqui.', 'The act is gone.');
    const members = act.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
    if (action === 'calm') { t.expect = clamp(t.expect - 15, 0, 100); t.conf = clamp(t.conf + 10, 0, 100); t.line = 'calm'; return l('Combinado: sem pressa. A expectativa baixa e o artista respira.', 'Agreed: no rush. Expectations ease and the act breathes.'); }
    if (action === 'ride') { t.line = 'ride'; return l('Vamos surfar o burburinho: o próximo disco chega quente — e a crítica vai cobrar.', 'We ride the buzz: the next record lands hot — and critics will demand more.'); }
    if (action === 'share') {
      const rel = s.releases[String(m.ref?.rel ?? '')];
      const cost = Math.round((rel?.revenue ?? 0) * 0.02);
      if (cost > 0) post(s, `traj18:share:${act.id}:${s.week}`, -cost, 'royalties', `Bônus do hit ${act.name}`);
      for (const p of members) p.resentment = clamp(p.resentment - 15, 0, 100);
      act.trust = clamp(act.trust + 4, 0, 100);
      t.line = 'free';
      return fmtL(l('A banda recebeu a parte do hit ({c}). O clima melhora.', 'The band got its share of the hit ({c}). The mood improves.'), { c: `$${Math.round(cost / 100).toLocaleString('en-US')}` });
    }
    if (action === 'formula') {
      t.line = 'formula'; t.exp = clamp(t.exp - 10, 0, 100);
      if (t.exp > 55) for (const p of members) p.morale = clamp(p.morale - 8, 0, 100);
      return t.exp > 55 ? l('Fórmula pedida. O artista engole a contragosto (moral −8).', 'Formula requested. The act swallows it reluctantly (morale −8).') : l('Fórmula pedida. O artista topa repetir o que deu certo.', 'Formula requested. The act is happy to repeat what worked.');
    }
    if (action === 'free') { t.line = 'free'; act.trust = clamp(act.trust + 6, 0, 100); return l('Liberdade criativa: o artista agradece (confiança +6).', 'Creative freedom: the act is grateful (trust +6).'); }
    if (action === 'push') {
      const flip: Record<React18, React18> = { reinvent: 'conserv', conserv: 'reinvent', shaken: 'conserv', proud: 'conserv' };
      t.react = flip[t.react ?? 'conserv']; t.conf = clamp(t.conf - 5, 0, 100); act.trust = clamp(act.trust - 6, 0, 100);
      return fmtL(l('Você impôs o rumo: {k}. O artista obedece, mas guarda.', 'You set the course: {k}. The act complies, but remembers.'), { k: REACT18[t.react].name });
    }
    if (action === 'rest') {
      act.hiatusUntil = Math.max(act.hiatusUntil ?? 0, s.week + 13); t.conf = clamp(t.conf + 15, 0, 100);
      for (const p of members) p.stress = clamp(p.stress - 10, 0, 100);
      if (t.react === 'shaken') t.react = undefined;
      return l('Pausa de 3 meses. O artista volta mais inteiro.', 'A 3-month break. The act comes back whole.');
    }
    act.trust = clamp(act.trust + 6, 0, 100);
    return l('Você apoiou o artista (confiança +6).', 'You backed the act (trust +6).');
  },
});

// ------------------------------------------------------------------ efeitos: apelo, crítica, gravação, palco

/** Fatores de apelo da trajetória (expectativa, pressão do hit × som). */
export function trajAppeal18(s: GameState, rel: Release, act: Act): [L, number][] {
  const t = traj18(s, act.id);
  if (!t) return [];
  const out: [L, number][] = [];
  const ant = Math.max(0, t.expect - 30) / 70 * (t.line === 'ride' ? 0.16 : t.line === 'calm' ? 0.04 : 0.1);
  if (ant > 0.005) out.push([l('Expectativa pelo disco', 'Anticipation for the record'), 1 + ant]);
  const sig = actSignature(s, act);
  const v = releaseSound(s, rel);
  if (t.pres > 40 && sig?.last && v && sig.n >= 2) {
    const d = dist(v, sig.last);
    const k = (t.pres - 40) / 60;
    if (d > 20) out.push([l('Fãs do hit queriam o mesmo som', 'Hit fans wanted the same sound'), 1 - 0.08 * k]);
    else if (d < 12) out.push([t.line === 'formula' ? l('Fórmula repetida: entregou o que pediram', 'Formula repeated: gave them what they asked') : l('Som próximo ao do hit', 'Sound close to the hit'), 1 + (t.line === 'formula' ? 0.05 : 0.03) * Math.max(0.4, k)]);
  }
  return out;
}
registerMod('appeal', 'traj18', (s, value, c) => {
  const rel = c.release;
  const act = rel && s.acts[rel.actId];
  if (!rel || !act || !isMine(s, act) || !eligible(rel)) return null;
  const f = trajAppeal18(s, rel, act);
  if (!f.length) return null;
  const m = f.reduce((t, x) => t * x[1], 1);
  const main = f.reduce((a, b) => (Math.abs(Math.log(b[1])) > Math.abs(Math.log(a[1])) ? b : a));
  return { value: value * m, label: main[0] };
});

/** Peso da expectativa na crítica: o disco é comparado com o melhor que o artista já fez. */
export function expectCritic18(s: GameState, rel: Release): { v: number; why: L } | null {
  const act = s.acts[rel.actId];
  const t = act && traj18(s, act.id);
  if (!act || !t || t.expect < 50) return null;
  let peak = 0;
  for (const id of act.releases) { const r = s.releases[id]; if (r && r.id !== rel.id && r.week <= rel.week && eligible(r)) peak = Math.max(peak, r.q); }
  if (!peak) return null;
  const k = (t.expect - 50) / 50 * (t.line === 'calm' ? 0.5 : t.line === 'ride' ? 1.3 : 1);
  if (rel.q < peak - 2) return { v: -Math.round(0.9 * k * 100) / 100, why: fmtL(l('Expectativa sufocante: abaixo do melhor disco (Q {p})', 'Suffocating expectations: below their best record (Q {p})'), { p: Math.round(peak) }) };
  if (rel.q >= peak + 2) return { v: Math.round(0.3 * k * 100) / 100, why: l('Superou a própria marca', 'Topped their own best') };
  return null;
}
registerReviewAdjust('traj18', (s, rel) => (mine18(s, rel) && eligible(rel) ? expectCritic18(s, rel)?.v ?? 0 : 0));

// gravação: confiança e química com o produtor mexem na performance
function recFx(s: GameState, songId: string): void {
  const so = s.songs[songId];
  const act = so && s.acts[so.actId];
  const t = act && traj18(s, act.id);
  if (!so || !act || !t || !isMine(s, act)) return;
  const d: Deltas = {};
  const c = Math.round(clamp((t.conf - 55) / 8, -4, 3));
  if (c) d.performance = c;
  if (t.react === 'shaken') d.performance = (d.performance ?? 0) - 3;
  if (so.producerId) { const ch = chemistry18(s, act, so.producerId, s.week).v; if (ch >= 50) d.performance = (d.performance ?? 0) + Math.round((ch - 40) / 15); }
  if (!Object.keys(d).length) return;
  const rec = songRec(s, so.id);
  if (!rec.recSeen) return;
  const b = rec.b as Record<string, Deltas>;
  if (b.traj18) return;
  b.traj18 = capDeltas(d, 5);
  syncSong(s, so.id);
}
registerSimHook('record', 'traj18', (s, _r, a) => { if (a.song) recFx(s, a.song.id); });

// palco × estúdio: reputações separadas
registerSimHook('show', 'traj18', (s, _r, a) => {
  const sh = a.show;
  const act = sh && s.acts[sh.actId];
  if (!sh || !act || !isMine(s, act) || !sh.capacity) return;
  const t = ensureT18(s, act);
  const fill = clamp(sh.sold / sh.capacity, 0, 1);
  const vibe = (act.members.reduce((x, id) => x + (s.persons[id]?.skills.stage ?? 50), 0) / Math.max(1, act.members.length));
  t.stage = clamp(t.stage + (fill * 70 + vibe * 0.3 - t.stage) * 0.06, 0, 100);
  t.shows += 1;
});
registerMod('showRevenue', 'traj18', (s, v, c) => {
  const t = c.act && traj18(s, c.act.id);
  if (!t || t.shows < 5 || Math.abs(t.stage - 50) < 5) return null;
  return { value: v * clamp(1 + 0.1 * (t.stage - 50) / 50, 0.92, 1.1), label: t.stage > 50 ? l('fama de palco', 'live reputation') : l('fama de palco fraca', 'weak live reputation') };
});

// mudança de formação vira era
const lineupEra = (s: GameState, f: Fact) => { for (const id of f.actors) { const t = ts(s).a[id]; if (t && s.acts[id]) era(s, t, 'lineup', f.text); } };
onFact('exit', lineupEra, 'traj18:exit');
onFact('split', lineupEra, 'traj18:split');

// ------------------------------------------------------------------ leitura para a interface (qualquer ato)

export interface TrajView18 {
  sig: { tags: L[]; cons: number; n: number; tm: string[] } | null;
  themes: { id: string; n: number; lived: boolean }[];
  prods: { id: string; name: string; n: number; chem: number }[];
  stage: number | null; studio: number | null; expect: number; exp: number | null; pres: number | null; conf: number | null;
  eras: Era18[]; outs: { rel: Release; o: Out18 }[]; react?: React18; line?: T18['line']; cult: boolean; mine: boolean;
}
/** Trajetória de qualquer artista (com estado próprio para os do jogador; derivada para os demais). */
export function trajView18(s: GameState, act: Act): TrajView18 {
  const t = traj18(s, act.id);
  const rels = act.releases.map((id) => s.releases[id]).filter((r): r is Release => !!r && eligible(r)).sort((a, b) => a.week - b.week);
  const sg = actSignature(s, act);
  const sig = sg ? { tags: soundTags(sg.v), cons: sg.first && sg.last && sg.n >= 2 ? Math.round(clamp(100 - dist(sg.first, sg.last) * 2.2, 0, 100)) : 50, n: sg.n, tm: actTrademarks(s, act.id) } : null;
  const lived = new Set(livedThemes18(s, act).map((x) => x.id));
  const th: Record<string, number> = { ...(t?.th ?? {}) };
  if (!t) for (const r of rels) for (const id of r.songs) { const x = s.songs[id] && songTheme(s, s.songs[id]); if (x) th[x] = (th[x] ?? 0) + 1; }
  for (const x of lived) th[x] = th[x] ?? 0;
  const themes = Object.entries(th).map(([id, n]) => ({ id, n, lived: lived.has(id) })).sort((a, b) => b.n - a.n).slice(0, 6);
  const pc: Record<string, number> = {};
  for (const r of rels) { const p = mainProducer18(s, r); if (p) pc[p] = (pc[p] ?? 0) + 1; }
  const prods = Object.entries(pc).map(([id, n]) => ({ id, name: prodDef18(id)?.name ?? id, n, chem: chemistry18(s, act, id).v })).sort((a, b) => b.n - a.n);
  const crit = rels.filter((r) => r.critic !== undefined);
  const studio = t ? Math.round(t.studio) : crit.length ? Math.round(crit.reduce((x, r) => x + (r.critic ?? 0), 0) / crit.length) : null;
  const lastCrit = crit[crit.length - 1]?.critic ?? 0;
  const eras: Era18[] = t ? t.eras.slice() : derivedEras(s, rels);
  const outs = rels.filter((r) => t?.out[r.id]).map((r) => ({ rel: r, o: t!.out[r.id] }));
  return {
    sig, themes, prods, stage: t && t.shows ? Math.round(t.stage) : null, studio,
    expect: Math.round(t ? t.expect : clamp(act.fame * 0.45 + (lastCrit >= 75 ? 15 : 0), 0, 100)), exp: t ? Math.round(t.exp) : act.members.length ? baseExp18(s, act) : null,
    pres: t ? Math.round(t.pres) : null, conf: t ? Math.round(t.conf) : null, eras, outs, react: t?.react, line: t?.line, cult: !!activeStory(s, act.id), mine: isMine(s, act),
  };
}
function derivedEras(s: GameState, rels: Release[]): Era18[] {
  const out: Era18[] = [];
  let prev: number[] | null = null;
  for (const r of rels) {
    const v = releaseSound(s, r);
    if (!out.length) out.push({ y: r.year, m: 0, k: 'debut', rel: r.id, t: fmtL(l('Estreia com "{r}".', 'Debut with "{r}".'), { r: r.title }) });
    else if (r.peak <= 3) out.push({ y: r.year, m: 0, k: 'hit', rel: r.id, t: fmtL(l('"{r}" chega ao topo ({p}º).', '"{r}" hits the top (#{p}).'), { r: r.title, p: r.peak }) });
    else if (prev && v && dist(v, prev) > 24) out.push({ y: r.year, m: 0, k: 'shift', rel: r.id, t: fmtL(l('"{r}" muda o som.', '"{r}" changes the sound.'), { r: r.title }) });
    if (v) prev = v;
  }
  return out.slice(-10);
}

/** Direção sugerida para o próximo projeto (playbot e conselheiro): desejo × pressão × reação. */
export function suggestDir18(s: GameState, act: Act): Dir {
  const t = traj18(s, act.id);
  if (!t) return 'signature';
  if (t.react === 'reinvent' || (t.exp >= 65 && t.pres < 50)) return 'bold';
  if (t.react === 'conserv' || t.react === 'shaken' || (t.pres >= 60 && t.exp < 55)) return 'safe';
  return 'signature';
}

// ------------------------------------------------------------------ conselheiro e porquês

registerAdvisorTip('traj18', (s) => {
  const out: ReturnType<Parameters<typeof registerAdvisorTip>[1]> = [];
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    const t = act && traj18(s, id);
    if (!act || !t) continue;
    const p = openProjects(s, id).find((x) => !x.releaseId);
    const pl = p && proj12(s).meta[p.id];
    if (pl && pl.dir === 'safe' && t.exp > 65) out.push({ id: `traj18:exp:${id}`, level: 'warn', cat: 'career', score: 55, text: fmtL(l('{a} quer experimentar, mas o projeto está no "Seguro".', '{a} wants to experiment, but the project is set to "Safe".'), { a: act.name }), why: [fmtL(l('Desejo de experimentar {e}/100.', 'Urge to experiment {e}/100.'), { e: Math.round(t.exp) })], effect: l('Gravar no seguro contra a vontade: emoção −6 no disco.', 'Recording safe against their will: emotion −6 on the record.'), goto: { act: id } });
    if (t.expect >= 70 && pl && pl.deadlineKind === 'tight') out.push({ id: `traj18:exp2:${id}`, level: 'warn', cat: 'career', score: 50, text: fmtL(l('{a} está sob expectativa sufocante e com prazo apertado.', '{a} is under suffocating expectations with a tight deadline.'), { a: act.name }), why: [fmtL(l('Expectativa {e}/100: a crítica vai comparar com o melhor disco.', 'Expectations {e}/100: critics will compare with their best record.'), { e: Math.round(t.expect) })], effect: l('Prazo folgado e repertório forte reduzem o risco de "não superou a estreia".', 'A relaxed deadline and strong repertoire cut the risk of "didn\'t top the debut".'), goto: { act: id } });
  }
  return out;
});

registerExplain('traj.expect', (s, c) => {
  const act = s.acts[String(c.act)];
  if (!act) return null;
  const v = trajView18(s, act);
  const t = traj18(s, act.id);
  return {
    title: l('Expectativa', 'Expectations'), value: v.expect, fmt: 'num',
    parts: [
      { label: l('Base: alcance do artista × 0,45', 'Base: act reach × 0.45'), value: baseExpect(act), fmt: 'num' },
      ...(t ? t.eras.filter((e) => e.k === 'cult' || e.k === 'hit').slice(-3).map((e) => ({ label: e.t, value: e.k === 'cult' ? '+15–30' : '+15', fmt: 'text' as const })) : []),
      ...(t?.line === 'calm' ? [{ label: l('Você protegeu o artista (−15)', 'You protected the act (−15)'), value: -15, fmt: 'signed' as const }] : []),
    ],
    note: l('Acima de 50, a crítica compara o disco com o melhor do artista (pode tirar até ~1 ponto); acima de 30, a expectativa também aumenta o apelo da estreia. Esfria 4% ao mês.', 'Above 50, critics compare the record with the act\'s best (can cost up to ~1 point); above 30, expectations also lift the debut appeal. Cools 4% a month.'),
  };
});
registerExplain('traj.exp', (s, c) => {
  const act = s.acts[String(c.act)];
  const t = act && traj18(s, act.id);
  if (!act) return null;
  return {
    title: l('Experimentar × repetir', 'Experiment × repeat'), value: t ? Math.round(t.exp) : baseExp18(s, act), fmt: 'num',
    parts: [
      { label: l('Base: curiosidade, rebeldia, coragem e teimosia do líder', 'Base: leader\'s curiosity, rebellion, courage and stubbornness'), value: baseExp18(s, act), fmt: 'num' },
      ...(t ? [{ label: l('Pressão para repetir o hit', 'Pressure to repeat the hit'), value: Math.round(t.pres), fmt: 'num' as const }] : []),
      ...(t?.react ? [{ label: fmtL(l('Reação ao último fracasso: {k}', 'Reaction to the last flop: {k}'), { k: REACT18[t.react].name }), note: REACT18[t.react].fx }] : []),
    ],
    note: l('Direção do projeto contra o desejo do artista custa emoção no disco; a favor, soma.', 'A project direction against the act\'s urge costs emotion; with it, adds.'),
  };
});
registerExplain('traj.rep', (s, c) => {
  const act = s.acts[String(c.act)];
  if (!act) return null;
  const v = trajView18(s, act);
  return {
    title: l('Palco × estúdio', 'Stage × studio'), value: `${v.stage ?? '—'} / ${v.studio ?? '—'}`, fmt: 'text',
    parts: [
      { label: l('Palco: lotação dos shows e presença de palco (média móvel)', 'Stage: show sell-through and stage presence (moving average)'), value: v.stage ?? '—', fmt: v.stage === null ? 'text' : 'num' },
      { label: l('Estúdio: notas da crítica (média móvel)', 'Studio: critic scores (moving average)'), value: v.studio ?? '—', fmt: v.studio === null ? 'text' : 'num' },
    ],
    note: l('Reputações separadas: banda de palco lota casas mesmo com disco morno (receita de show até ±10%); banda de estúdio vive da crítica.', 'Separate reputations: a live band fills rooms even with a lukewarm record (show revenue up to ±10%); a studio band lives on reviews.'),
  };
});
registerExplain('traj.sig', () => ({
  title: l('Assinatura sonora', 'Sound signature'), value: '', fmt: 'text',
  parts: [{ label: l('Média móvel do som dos discos (os recentes pesam mais)', 'Moving average of the records\' sound (recent ones weigh more)') }, { label: l('Consolidação: quão perto o som dos 2 últimos discos está dos 2 primeiros', 'Consolidation: how close the last 2 records sound to the first 2') }],
  note: l('Assinatura forte dá timbres de marca e identidade reconhecível (apelo); virada brusca estranha os fãs antigos e abre uma era nova.', 'A strong signature brings trademark timbres and a recognizable identity (appeal); an abrupt shift puzzles old fans and opens a new era.'),
}));
export const dimName18 = (d: keyof typeof DIM18): L => DIM18[d].name;
