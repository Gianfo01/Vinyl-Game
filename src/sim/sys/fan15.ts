// Rodada 15 — Fandom que pede e briga: superfãs organizados fazem petições (lançar a faixa guardada,
// ingresso justo contra cambistas), e fandoms rivais entram em guerra. Cada pedido vira decisão na Mesa
// com consequência visível em superfãs, toxicidade, confiança, imagem, hype e bilheteria. O ritual de fã
// muda com a época (cartas → rádio → TV → fitas → fóruns → streaming → vídeo curto).

import { clamp, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { emitEvent, type EventDef } from '../events';
import { deferEvents, registerExt4, registerMod, registerSimHook } from '../ext4';
import { fandomOf, ritualFor } from '../fandom';
import { releaseDemo, songStatus } from '../repertoire';
import type { GameState } from '../types';
import { fmtL, notify, playerActs, remember } from '../util';
import { addHype } from './hype12';
import { opine } from './persona13';

export interface Fan15 { cd: Record<string, number>; cap: Record<string, number>; pr: Record<string, [string, number]>; log: [number, number, L][] }
declare module '../ext4' { interface Ext4 { fan15: Fan15 } }
const fresh = (): Fan15 => ({ cd: {}, cap: {}, pr: {}, log: [] });
registerExt4('fan15', fresh);
export function fn15(s: GameState): Fan15 {
  const x = s.x4 as unknown as { fan15?: Fan15 };
  const st = (x.fan15 ??= fresh());
  st.cd ??= {}; st.cap ??= {}; st.pr ??= {}; st.log ??= [];
  return st;
}
const logIt = (s: GameState, t: L) => { const st = fn15(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 20) st.log.length = 20; };

/** Faixa gravada e inédita que os fãs conhecem (de shows, vazamentos ou do cofre). */
export const vaultSong = (s: GameState, actId: string) => (s.acts[actId]?.songs ?? []).map((id) => s.songs[id]).filter((x) => x && x.recorded && ['recorded', 'vault'].includes(songStatus(s, x))).sort((a, b) => b.q - a.q)[0];
/** Ato de outro dono, mesmo gênero, com fandom grande: alvo de guerra de fandoms. */
function rivalFandom(s: GameState, actId: string): string | undefined {
  const a = s.acts[actId];
  const mine = new Set(playerActs(s));
  return Object.values(s.acts).filter((b) => !mine.has(b.id) && b.genre === a.genre && b.status !== 'retired' && b.status !== 'split' && (s.fandoms[b.id]?.superfans ?? 0) > 40)
    .sort((x, y) => (s.fandoms[y.id]?.superfans ?? 0) - (s.fandoms[x.id]?.superfans ?? 0))[0]?.id;
}

/** Teto de ingresso aceito: bilheteria um pouco menor enquanto vale (explicado na autópsia do show). */
registerMod('showRevenue', 'fan15', (s, v, ctx) => ctx.act && (fn15(s).cap[ctx.act.id] ?? 0) > s.week ? { value: v * 0.94, label: l('Teto de ingresso prometido aos fãs', 'Ticket cap promised to fans') } : null);

export function fanMonth15(s: GameState): void {
  const st = fn15(s);
  const r = Rng.fromSeed(`${s.config.seed}:fan15:${s.year}:${s.month}`);
  // promessas: cumprida (faixa lançada) rende gratidão; vencida (1 ano) volta como cobrança
  for (const [id, [sid, wk]] of Object.entries(st.pr)) {
    const a = s.acts[id], so = s.songs[sid];
    if (!a || !so) { delete st.pr[id]; continue; }
    if (songStatus(s, so) === 'released') { delete st.pr[id]; sf(s, id, 1.06); a.trust = clamp(a.trust + 2, 0, 100); done(s, fmtL(l('Promessa cumprida: "{t}" saiu e os fãs de {a} agradecem.', 'Promise kept: "{t}" is out and {a} fans are grateful.'), { t: so.title, a: a.name }), 'good'); }
    else if (s.week - wk > 52) { delete st.pr[id]; tox(s, id, 12); sf(s, id, 0.94); done(s, fmtL(l('Promessa quebrada: "{t}" não saiu e os fãs de {a} se sentem enganados.', 'Promise broken: "{t}" never came out and {a} fans feel cheated.'), { t: so.title, a: a.name }), 'bad'); }
  }
  if (s.decisions.some((d) => d.eventId.startsWith('fan15_'))) return;
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a) => a && (s.fandoms[a.id]?.superfans ?? 0) >= 40 && (st.cd[a.id] ?? 0) <= s.week);
  if (!acts.length || !r.chance(0.18)) return;
  const a = r.pick(acts);
  const f = fandomOf(s, a.id);
  const ritual = ritualFor(s);
  const opts: string[] = [];
  const v = vaultSong(s, a.id);
  if (v) opts.push('fan15_vault');
  if (s.year >= 1965 && s.tours.some((t) => t.actId === a.id)) opts.push('fan15_tickets');
  const riv = rivalFandom(s, a.id);
  if (riv && f.toxicity > 25) opts.push('fan15_war');
  if (!opts.length) return;
  st.cd[a.id] = s.week + 34;
  const id = r.pick(opts);
  emitEvent(s, r, id, { act: a.id, other: riv ?? '', song: v?.id ?? '', songTitle: v?.title ?? '', ritualPt: ritual.pt, ritualEn: ritual.en, fanName: f.name ?? a.name, superN: f.superfans });
}

const A = (s: GameState, c: Record<string, string | number>) => s.acts[String(c.act)];
const sf = (s: GameState, id: string, k: number) => { const f = fandomOf(s, id); f.superfans = Math.max(0, Math.round(f.superfans * k)); return f; };
const tox = (s: GameState, id: string, d: number) => { const f = fandomOf(s, id); f.toxicity = clamp(f.toxicity + d, 0, 100); };
const img = (s: GameState, id: string, d: number) => { const a = s.acts[id]; if (a?.image) a.image.publicImage = clamp(a.image.publicImage + d, 0, 100); };
const done = (s: GameState, t: L, kind: 'good' | 'bad' | 'info') => { logIt(s, t); notify(s, t, kind); };

deferEvents<EventDef>([
  {
    id: 'fan15_vault', cat: 'people', tone: 'neutral', tags: [], cooldown: 4, forcedOnly: true,
    title: l('Os {fanName} querem "{songTitle}"', 'The {fanName} want "{songTitle}"'),
    text: l('{superN} superfãs de {act} se organizaram ({ritualPt}) exigindo o lançamento de "{songTitle}", gravada e guardada. A petição está nos jornais da cena.', '{superN} {act} superfans organised ({ritualEn}) demanding the release of "{songTitle}", recorded and shelved. The petition is all over the scene press.'),
    options: [
      { id: 'give', label: l('Lançar como presente aos fãs', 'Release it as a gift to fans'), hint: l('Sai como demo/single simples: superfãs +10%, confiança e hype sobem; a faixa não ganha campanha.', 'Goes out as a simple demo/single: superfans +10%, trust and hype rise; no campaign behind it.'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; const so = s.songs[String(c.song)]; if (so) so.vault = false; const err = releaseDemo(s, Rng.fromSeed(`${s.config.seed}:fan15v:${c.song}`), String(c.song)); sf(s, a.id, err ? 1.03 : 1.1); a.trust = clamp(a.trust + 3, 0, 100); addHype(s, `a:${a.id}`, 'fan15', l('Fãs atendidos', 'Fans heard'), 6); done(s, fmtL(err ? l('Não deu para lançar "{t}" agora ({e}), mas os fãs viram o esforço.', 'Could not release "{t}" now ({e}), but fans saw the effort.') : l('"{t}" sai para os fãs de {a}: o fandom comemora.', '"{t}" goes out to {a}\'s fans: the fandom celebrates.'), { t: String(c.songTitle), a: a.name, e: err ?? '' }), 'good'); } },
      { id: 'later', label: l('Prometer para o próximo disco', 'Promise it for the next album'), hint: l('Você tem 1 ano: lançada, superfãs +6% e confiança; esquecida, toxicidade +12 e superfãs −6%.', 'You have 1 year: released, superfans +6% and trust; forgotten, toxicity +12 and superfans −6%.'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; tox(s, a.id, 3); fn15(s).pr[a.id] = [String(c.song), s.week]; } },
      { id: 'no', label: l('Recusar: a obra é do artista', 'Refuse: the art is the artist\'s call'), hint: l('Superfãs −4%, toxicidade +6; o artista aprecia se for perfeccionista.', 'Superfans −4%, toxicity +6; the artist appreciates it if a perfectionist.'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; sf(s, a.id, 0.96); tox(s, a.id, 6); done(s, fmtL(l('Os fãs de {a} reclamam: "{t}" continua no cofre.', '{a} fans grumble: "{t}" stays in the vault.'), { a: a.name, t: String(c.songTitle) }), 'bad'); } },
    ],
  },
  {
    id: 'fan15_tickets', cat: 'people', tone: 'bad', tags: [], cooldown: 4, forcedOnly: true,
    title: l('Fãs de {act} contra cambistas e preços', '{act} fans against scalpers and prices'),
    text: l('Os {fanName} acusam o selo de deixar ingressos nas mãos de cambistas e cobrar caro demais. Querem um teto de preço e cota para o fã-clube.', 'The {fanName} accuse the label of letting scalpers grab tickets and charging too much. They want a price cap and a fan-club allocation.'),
    options: [
      { id: 'cap', label: l('Aceitar o teto por 6 meses', 'Accept the cap for 6 months'), hint: l('Bilheteria −6% enquanto vale; toxicidade −15, superfãs +5%, imagem pública +3.', 'Box office −6% while it lasts; toxicity −15, superfans +5%, public image +3.'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; fn15(s).cap[a.id] = s.week + 26; tox(s, a.id, -15); sf(s, a.id, 1.05); img(s, a.id, 3); done(s, fmtL(l('{a} adota ingresso justo: fãs aplaudem, bilheteria cai um pouco.', '{a} adopts fair tickets: fans cheer, box office dips a little.'), { a: a.name }), 'good'); } },
      { id: 'blame', label: l('Culpar a casa de shows', 'Blame the venues'), hint: l('Sem custo; funciona se o artista tem boa imagem, senão os fãs percebem.', 'Free; works if the artist has a good image, otherwise fans see through it.'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; const ok = (a.image?.publicImage ?? 50) >= 55; tox(s, a.id, ok ? -6 : 8); img(s, a.id, ok ? 0 : -2); done(s, ok ? fmtL(l('A versão do selo cola: a raiva dos fãs de {a} vai para as casas.', 'The label\'s version sticks: {a} fans aim their anger at the venues.'), { a: a.name }) : fmtL(l('Ninguém acredita: os fãs de {a} ficam mais irritados.', 'Nobody buys it: {a} fans get angrier.'), { a: a.name }), ok ? 'info' : 'bad'); } },
      { id: 'ignore', label: l('Ignorar', 'Ignore'), hint: l('Toxicidade +10, imagem pública −3.', 'Toxicity +10, public image −3.'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; tox(s, a.id, 10); img(s, a.id, -3); } },
    ],
  },
  {
    id: 'fan15_war', cat: 'people', tone: 'neutral', tags: [], cooldown: 4, forcedOnly: true,
    title: l('Guerra de fandoms: {act} × {otherName}', 'Fandom war: {act} × {otherName}'),
    text: l('Os {fanName} e os fãs de {otherName} trocam ataques ({ritualPt}). A imprensa adora; os artistas, nem tanto.', 'The {fanName} and {otherName} fans trade attacks ({ritualEn}). The press loves it; the artists, not so much.'),
    options: [
      { id: 'fuel', label: l('Alimentar a rivalidade', 'Fuel the rivalry'), hint: l('Hype +10 agora; toxicidade +15, imagem −2 e os artistas rivais passam a desgostar de você.', 'Hype +10 now; toxicity +15, image −2 and the rival artists start to dislike you.'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; addHype(s, `a:${a.id}`, 'fan15war', l('Guerra de fandoms', 'Fandom war'), 10); tox(s, a.id, 15); img(s, a.id, -2); for (const m of s.acts[String(c.other)]?.members ?? []) opine(s, `p:${m}`, -6, l('incentivou ataques dos fãs dele contra mim.', 'egged on their fans against me.')); remember(s, 'fan15war', fmtL(l('A rivalidade entre os fãs de {a} e {b} vira manchete.', 'The rivalry between {a} and {b} fans hits the headlines.'), { a: a.name, b: s.acts[String(c.other)]?.name ?? '?' }), { actId: a.id }); } },
      { id: 'calm', label: l('Pedir paz publicamente', 'Call for peace publicly'), hint: l('Toxicidade −20, imagem +2; parte dos superfãs acha fraqueza (−3%).', 'Toxicity −20, image +2; some superfans see weakness (−3%).'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; tox(s, a.id, -20); img(s, a.id, 2); sf(s, a.id, 0.97); for (const m of s.acts[String(c.other)]?.members ?? []) opine(s, `p:${m}`, 3, l('pediu paz entre os fandoms.', 'called for peace between the fandoms.')); } },
      { id: 'quiet', label: l('Ficar quieto', 'Stay quiet'), hint: l('A briga se esgota sozinha; toxicidade +4.', 'The fight burns out on its own; toxicity +4.'),
        apply: (s, _r, c) => { const a = A(s, c); if (a) tox(s, a.id, 4); } },
    ],
  },
]);

registerSimHook('month', 'fan15', (s) => fanMonth15(s));
