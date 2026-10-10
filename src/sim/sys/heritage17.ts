// Rodada 17 — a história real da música conversa com a partida:
// • artistas que definiram cada década (marca no ato e lista em Lendas → Épocas);
// • cenas locais reais (Seattle 1988–94, Madchester, Bristol, Bronx, Motown…): na janela real, quem é da cidade e
//   do estilo ganha apelo e o gênero esquenta; a cena vira Fato;
// • covers e samples famosos acontecem na data real: o dono da obra original recebe (se for você, entra no caixa),
//   o original é redescoberto, processos viram Fato;
// • sample sem liberação dá processo — raro antes de Grand Upright v. Warner (dez/1991), quase certo depois.

import { Rng, clamp } from '../../core/rng';
import { COVERS17, ERAS17, SCENES17, type Cover17, type Scene17 } from '../../data/heritage17';
import { cityById, familyOf, genreById, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, post } from '../util';
import { chron } from './chron9';
import { realAct17, realName17, norm17 } from './realidx17';
import { histRoll } from '../history15';

interface H17 { scenes: Record<string, 1>; covers: Record<string, 1>; suits: Record<string, number> }
declare module '../ext4' { interface Ext4 { heritage17: H17 } }
const fresh = (): H17 => ({ scenes: {}, covers: {}, suits: {} });
registerExt4('heritage17', fresh);
export function heritage17(s: GameState): H17 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.heritage17 ??= fresh()) as H17;
  st.scenes ??= {}; st.covers ??= {}; st.suits ??= {};
  return st;
}

// ---------------------------------------------------------------- épocas

const DEF = new Map<string, number[]>();
for (const [d, names] of ERAS17) for (const n of names) DEF.set(norm17(n), [...(DEF.get(norm17(n)) ?? []), d]);
/** Décadas que o ato definiu (só as já vividas na partida). */
export function definedDecades17(s: GameState, act: Act): number[] {
  const n = realName17(act);
  return n ? (DEF.get(norm17(n)) ?? []).filter((d) => d <= s.year) : [];
}

// ---------------------------------------------------------------- cenas

export const activeScenes17 = (s: GameState): Scene17[] => SCENES17.filter((x) => x[3] <= s.year && s.year <= x[4] && genreById[x[2]] && genreById[x[2]].born <= s.year
  && !(s.config.history !== 'strict' && x[3] >= s.config.startYear && histRoll(s, `scene18:${x[0]}`) < 0.4));
export const sceneOfAct17 = (s: GameState, act: Act): Scene17 | undefined =>
  activeScenes17(s).find((x) => x[1] === act.city && (act.genre === x[2] || familyOf(act.genre) === familyOf(x[2])));

registerMod('appeal', 'scenes17', (s, value, ctx) => {
  const act = ctx.release ? s.acts[ctx.release.actId] : ctx.act;
  if (!act) return null;
  const sc = sceneOfAct17(s, act);
  if (!sc) return null;
  const exact = act.genre === sc[2];
  return { value: value * (exact ? 1.08 : 1.04), label: fmtL(l('Cena local em ebulição: {c}', 'Local scene on fire: {c}'), { c: l(sc[5], sc[6]) }) };
});

// ---------------------------------------------------------------- covers e samples

const keyOf = (c: Cover17) => `${c[0]}:${norm17(c[3])}`;
function coverEvent(s: GameState, c: Cover17): void {
  const [y, , kind, song, origN, newN, out, pt, en, val] = c;
  const orig = realAct17(s, origN);
  const neo = newN ? realAct17(s, newN) : undefined;
  if (!orig && !neo) return;
  const txt = l(pt, en);
  const actors = [orig?.id, neo?.id].filter(Boolean) as string[];
  const tags = [kind, out === 'lawsuit' || out === 'won' ? 'case' : 'rights', out === 'unpaid' ? 'bad' : 'good'];
  emitFact(s, { kind: out === 'lawsuit' || out === 'won' ? 'case_ruling' : 'cover', actors, place: (neo ?? orig)?.city, severity: out === 'lawsuit' ? 50 : 35, visibility: 'public', tags, src: 'heritage17', text: txt, data: { song } });
  chron(s, { k: out === 'lawsuit' || out === 'won' ? 'lawsuit' : 'cover', i: 3, a: actors, t: txt });
  // o original é redescoberto
  if (orig && kind !== 'credit' && orig.status !== 'split') { orig.momentum = clamp(orig.momentum + 6, 0, 100); orig.fame = clamp(orig.fame + 2, 0, 100); }
  // dinheiro: quem tem a obra recebe; quem usou sem pedir paga
  const amt = money(s, val * (out === 'credit' ? 0.5 : 1));
  if (amt > 0 && orig?.owner === 'player') {
    post(s, `cover17:${y}:${norm17(song)}`, amt, 'rights', `Edição: ${song}`);
    notify(s, fmtL(l('"{s}" ganhou uma versão famosa — a edição do seu catálogo rende {v}.', '"{s}" got a famous new version — your catalog\'s publishing earns {v}.'), { s: song, v: Math.round(amt / 100).toLocaleString('en-US') }), 'good');
  }
  if (amt > 0 && neo?.owner === 'player' && (out === 'lawsuit' || out === 'credit')) {
    post(s, `cover17p:${y}:${norm17(song)}`, -amt, 'rights', `Acordo: ${song}`);
    notify(s, fmtL(l('Processo pelo uso de "{s}": seu selo paga {v}.', 'Lawsuit over "{s}": your label pays {v}.'), { s: song, v: Math.round(amt / 100).toLocaleString('en-US') }), 'bad');
  }
}

/** Covers/samples reais já acontecidos (para a interface). */
export const pastCovers17 = (s: GameState): Cover17[] => COVERS17.filter((c) => s.year > c[0] || (s.year === c[0] && s.month >= c[1]));

// ---------------------------------------------------------------- processo por sample sem liberação

export const GRAND_UPRIGHT = 1992;
export const sampleSuitChance17 = (s: GameState, charting: boolean): number => (s.year >= GRAND_UPRIGHT ? 0.07 : 0.012) * (charting ? 2 : 1);

function sampleSuits(s: GameState): void {
  const st = heritage17(s);
  for (const req of s.samples) {
    if (req.status !== 'uncleared' || st.suits[req.id]) continue;
    const song = s.songs[req.songId];
    const rel = song?.releaseId ? s.releases[song.releaseId] : undefined;
    if (!song || !rel || rel.owner !== 'player') continue;
    const src = s.songs[req.sourceSongId];
    const srcAct = src ? s.acts[src.actId] : undefined;
    const r = Rng.fromSeed(`${s.config.seed}:heritage17:${req.id}:${s.week}`);
    if (!r.chance(sampleSuitChance17(s, rel.lastPos > 0 && rel.lastPos <= 40))) continue;
    const pay = money(s, (20000 + (srcAct?.fame ?? 20) * 800 + Math.min(400000, rel.totalUnits * 0.4)) * (s.year >= GRAND_UPRIGHT ? 2 : 1));
    st.suits[req.id] = s.week;
    req.status = 'cleared'; // acordo: o dono da obra passa a receber a fatia da edição
    post(s, `sample17:${req.id}`, -pay, 'legal', `Processo por sample: ${song.title}`);
    const why = s.year >= GRAND_UPRIGHT ? l('Desde Grand Upright v. Warner (1991), sample sem liberação é processo quase certo.', 'Since Grand Upright v. Warner (1991), an uncleared sample almost always means a lawsuit.') : l('Antes de 1991 quase ninguém processava por sample — mas desta vez processaram.', 'Before 1991 hardly anyone sued over samples — but this time they did.');
    emitFact(s, { kind: 'case_ruling', actors: ['player', song.actId, ...(srcAct ? [srcAct.id] : [])], severity: 45, visibility: 'public', tags: ['bad', 'rights', 'sample'], src: 'heritage17',
      text: fmtL(l('"{s}" usou "{o}" sem liberação: acordo de {v} e a edição passa a ser dividida.', '"{s}" used "{o}" without clearance: a {v} settlement and the publishing is now split.'), { s: song.title, o: src?.title ?? '?', v: Math.round(pay / 100).toLocaleString('en-US') }) });
    notify(s, fmtL(l('Processo pelo sample em "{s}": {v} e parte da edição. {w}', 'Sample lawsuit over "{s}": {v} and part of the publishing. {w}'), { s: song.title, v: Math.round(pay / 100).toLocaleString('en-US'), w: why }), 'bad');
  }
}

registerSimHook('month', 'heritage17', (s) => {
  const st = heritage17(s);
  for (const sc of SCENES17) {
    if (st.scenes[sc[0]] || s.year < sc[3] || s.year > sc[4] || !genreById[sc[2]] || genreById[sc[2]].born > s.year) continue;
    if (s.config.history !== 'strict' && sc[3] >= s.config.startYear && histRoll(s, `scene18:${sc[0]}`) < 0.4) { st.scenes[sc[0]] = 1; continue; } // r18: história alternativa: nem toda cena real acontece
    st.scenes[sc[0]] = 1;
    if (s.year - sc[3] > 1) continue; // partida começou com a cena já madura: sem manchete
    s.genrePop[sc[2]] = clamp((s.genrePop[sc[2]] ?? 0.6) + 0.15, 0.15, 2.2);
    const txt = fmtL(l('Cena em ebulição: {n} ({c}). {t}', 'A scene is igniting: {n} ({c}). {t}'), { n: l(sc[5], sc[6]), c: cityById[sc[1]]?.name ?? sc[1], t: l(sc[7], sc[8]) });
    emitFact(s, { kind: 'scene', actors: [], place: sc[1], severity: 40, visibility: 'public', tags: ['good', 'scene', sc[2]], src: 'heritage17', text: txt });
    chron(s, { k: 'scene', i: 3, a: [], t: txt, c: sc[1], g: sc[2] });
    if (Object.values(s.acts).some((a) => a.owner === 'player' && a.city === sc[1])) notify(s, fmtL(l('{t} Seus artistas de lá ganham apelo enquanto a cena durar.', '{t} Your acts from there gain appeal while the scene lasts.'), { t: txt }), 'good');
  }
  if (s.config.realNames) for (const c of COVERS17) {
    const k = keyOf(c);
    if (st.covers[k] || s.year < c[0] || (s.year === c[0] && s.month < c[1])) continue;
    st.covers[k] = 1;
    if (s.year - c[0] <= 1 && (s.config.history === 'strict' || c[0] < s.config.startYear)) coverEvent(s, c); // r18: história alternativa não reencena covers reais
  }
  sampleSuits(s);
});

/** Texto curto para a página do ato: épocas e cena. */
export function heritageLine17(s: GameState, act: Act): L | null {
  const ds = definedDecades17(s, act);
  const sc = sceneOfAct17(s, act);
  if (!ds.length && !sc) return null;
  const parts: string[] = [];
  const partsEn: string[] = [];
  if (ds.length) { parts.push(`Definiu a época: anos ${ds.map((d) => String(d).slice(2)).join(', ')}`); partsEn.push(`Defined the era: the ${ds.map((d) => `'${String(d).slice(2)}s`).join(', ')}`); }
  if (sc) { parts.push(`Cena: ${sc[5]}`); partsEn.push(`Scene: ${sc[6]}`); }
  return l(parts.join(' · '), partsEn.join(' · '));
}
