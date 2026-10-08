// Críticas completas (rodada 5). Cada crítico dá nota por aspecto (melodia, letra, interpretação,
// produção, originalidade, coesão), pesa os aspectos pelo próprio gosto (mainstream x underground,
// gêneros favoritos), compara com o disco anterior e com o rival do ano, aponta a melhor e a pior
// faixa e fecha com um veredito. O save guarda só números e uma semente; o texto é montado na hora
// (determinístico), para os saves não incharem.

import { clamp, hashString, type Rng } from '../core/rng';
import { STUDIO_TIERS } from '../data/rules';
import { familyOf, genreById, l, type L } from '../data/world';
import type { CriticDef } from './media';
import type { GameState, Release, Song } from './types';
import type { Review } from './xtypes';
import { fmtL } from './util';

export type Aspect = 'melody' | 'lyrics' | 'performance' | 'production' | 'originality' | 'cohesion';
export const ASPECTS: Aspect[] = ['melody', 'lyrics', 'performance', 'production', 'originality', 'cohesion'];
export const ASPECT_NAMES: Record<Aspect, L> = {
  melody: l('Melodias', 'Melodies'), lyrics: l('Letras', 'Lyrics'), performance: l('Interpretação', 'Performance'),
  production: l('Produção', 'Production'), originality: l('Originalidade', 'Originality'), cohesion: l('Coesão', 'Cohesion'),
};

export interface ReviewCtx {
  nth: number;
  prev?: string;
  prevPeak?: number;
  prevAvg?: number;
  rival?: string;
  rivalAct?: string;
  rivalBetter?: boolean;
}

/** Médias 0..100 de cada aspecto do lançamento. */
export function releaseAspects(s: GameState, rel: Release): Record<Aspect, number> {
  const songs = rel.songs.map((id) => s.songs[id]).filter((x): x is Song => !!x);
  const avg = (k: 'melody' | 'lyrics' | 'performance' | 'production' | 'originality') => songs.reduce((t, x) => t + x[k], 0) / Math.max(1, songs.length);
  let cohesion = songs.length ? songs.reduce((t, x) => t + x.q, 0) / songs.length : 50;
  if (songs.length > 1) {
    const m = cohesion;
    const sd = Math.sqrt(songs.reduce((t, x) => t + (x.q - m) ** 2, 0) / songs.length);
    cohesion = clamp(m + 12 - sd * 2.2, 5, 100);
  }
  return { melody: avg('melody'), lyrics: avg('lyrics'), performance: avg('performance'), production: avg('production'), originality: avg('originality'), cohesion };
}

/** Pesos de cada aspecto para um crítico (o gosto dele). */
export function criticWeights(c: CriticDef): Record<Aspect, number> {
  const w: Record<Aspect, number> = { melody: 1, lyrics: 1, performance: 1, production: 0.8, originality: 0.8, cohesion: 0.5 };
  if (c.mainstream > 0.3) { w.melody += 0.5; w.production += 0.4; w.originality -= 0.3; }
  if (c.mainstream < -0.3) { w.originality += 0.7; w.lyrics += 0.3; w.production -= 0.3; }
  if (c.harsh > 0.7) { w.originality += 0.3; w.cohesion += 0.3; }
  const f = c.favors.join(',');
  if (/hiphop|folk|country/.test(f)) w.lyrics += 0.5;
  if (/electronic/.test(f)) w.production += 0.6;
  if (/rock|soul/.test(f)) w.performance += 0.3;
  if (/blues_jazz/.test(f)) { w.performance += 0.4; w.originality += 0.2; }
  if (/pop|latin/.test(f)) w.melody += 0.5;
  return w;
}

function ctxOf(s: GameState, rel: Release): ReviewCtx {
  const act = s.acts[rel.actId];
  const prevs = (act?.releases ?? []).map((id) => s.releases[id]).filter((x) => x && x.id !== rel.id && x.week < rel.week && !x.reissueOf).sort((a, b) => b.week - a.week);
  const prev = prevs[0];
  const ctx: ReviewCtx = { nth: prevs.length + 1 };
  if (prev) {
    ctx.prev = prev.title;
    ctx.prevPeak = prev.peak;
    const rv = s.reviews[prev.id];
    if (rv?.length) ctx.prevAvg = Math.round((rv.reduce((t, x) => t + x.score, 0) / rv.length) * 10) / 10;
  }
  if (act) {
    const fam = familyOf(act.genre);
    let best: Release | undefined;
    for (const id in s.releases) {
      const x = s.releases[id];
      if (x.year !== rel.year || x.actId === rel.actId || x.id === rel.id) continue;
      const xa = s.acts[x.actId];
      if (!xa || familyOf(xa.genre) !== fam) continue;
      if (!best || x.q > best.q) best = x;
    }
    if (best) { ctx.rival = best.title; ctx.rivalAct = s.acts[best.actId]?.name; ctx.rivalBetter = best.q > rel.q; }
  }
  return ctx;
}

/** Gera a crítica completa de um crítico (números + semente para o texto). */
export function buildReview(s: GameState, r: Rng, rel: Release, c: CriticDef, aspects: Record<Aspect, number>, ctx: ReviewCtx): Review {
  const act = s.acts[rel.actId];
  const fam = act ? familyOf(act.genre) : 'pop';
  const fav = c.favors.includes(fam) ? 1 : c.dislikes.includes(fam) ? -1 : 0;
  const w = criticWeights(c);
  const a10 = {} as Record<Aspect, number>;
  let sum = 0;
  let wsum = 0;
  for (const k of ASPECTS) {
    const v = clamp(aspects[k] / 10 + fav * (fav > 0 ? 0.6 : 0.9) - c.harsh * 0.9 + 0.35 + r.normal(0, 0.5), 0.5, 10);
    a10[k] = Math.round(v * 10) / 10;
    sum += v * w[k];
    wsum += w[k];
  }
  let score = sum / wsum + (c.mainstream * ((act?.positioning ?? 50) - 50)) / 60 + r.normal(0, 0.35);
  score = Math.round(clamp(score, 0.5, 10) * 10) / 10;
  const songs = rel.songs.map((id) => s.songs[id]).filter((x): x is Song => !!x).sort((x, y) => y.q - x.q);
  return {
    critic: c.name, outlet: c.outlet, score, quote: headline(score, hashString(`${rel.id}|${c.name}`)),
    seed: hashString(`${rel.id}#${c.name}#${s.config.seed}`),
    aspects: a10,
    best: songs.length > 1 ? songs[0].title : undefined,
    worst: songs.length > 2 ? songs[songs.length - 1].title : undefined,
    fav,
    ctx,
  };
}

/** Todas as críticas de um lançamento (o número de críticos é decidido em media.ts). */
export function buildReviews(s: GameState, r: Rng, rel: Release, critics: CriticDef[]): Review[] {
  const aspects = releaseAspects(s, rel);
  const ctx = ctxOf(s, rel);
  return critics.map((c) => buildReview(s, r, rel, c, aspects, ctx));
}

// ---------------------------------------------------------------- texto

const H: [number, L[]][] = [
  [8.5, [l('Obra-prima instantânea.', 'An instant masterpiece.'), l('Um disco para a história.', 'A record for the ages.'), l('Difícil imaginar o ano sem ele.', 'Hard to imagine the year without it.')]],
  [7, [l('Forte, com momentos memoráveis.', 'Strong, with memorable moments.'), l('Cresce a cada audição.', 'Grows with every listen.'), l('Confiante e cheio de ideias.', 'Confident and full of ideas.')]],
  [5.5, [l('Competente, mas previsível.', 'Competent but predictable.'), l('Bom de ouvir, fácil de esquecer.', 'Easy to hear, easy to forget.'), l('Acerta mais do que erra.', 'Hits more than it misses.')]],
  [4, [l('Irregular e sem foco.', 'Uneven and unfocused.'), l('Boas intenções, pouco resultado.', 'Good intentions, little payoff.'), l('Um passo atrás.', 'A step backwards.')]],
  [0, [l('Um erro de percurso.', 'A misstep.'), l('Difícil de defender.', 'Hard to defend.'), l('Melhor esquecer.', 'Best forgotten.')]],
];

function headline(score: number, h: number): L {
  const band = H.find(([min]) => score >= min)![1];
  return band[h % band.length];
}

const pick = <T,>(xs: T[], h: number, salt: number): T => xs[(h >>> salt) % xs.length];

const HIGH: Record<Aspect, L[]> = {
  melody: [
    l('Os refrões grudam já na primeira audição; há pelo menos três canções que vão tocar em todo lugar.', 'The choruses stick on first listen; at least three songs will be everywhere.'),
    l('A melodia é a grande arma: cada faixa tem um gancho que volta à cabeça horas depois.', 'Melody is the big weapon: every track has a hook that returns hours later.'),
    l('Raro ouvir tanta melodia bem resolvida num disco só.', 'Rare to hear so many well-built melodies on one record.'),
  ],
  lyrics: [
    l('As letras são o coração do disco{theme}: imagens precisas, nenhuma rima de enfeite.', 'The lyrics are the record\'s heart{theme}: precise images, no filler rhymes.'),
    l('Dá vontade de ler o encarte inteiro{theme}; poucos escrevem com essa honestidade.', 'You want to read the whole sleeve{theme}; few write with this honesty.'),
    l('Versos que viram citação{theme} — a escrita amadureceu muito.', 'Lines that become quotes{theme} — the writing has matured a lot.'),
  ],
  performance: [
    l('{lead} canta como se a vida dependesse disso, e a banda acompanha com uma pegada rara.', '{lead} sings as if life depended on it, and the band follows with rare grip.'),
    l('A interpretação é o ponto alto: dá para ouvir o suor no estúdio.', 'The performance is the high point: you can hear the sweat in the studio.'),
    l('{lead} está no auge; as tomadas soam vivas, quase ao vivo.', '{lead} is at a peak; the takes sound alive, almost live.'),
  ],
  production: [
    l('A produção ({studio}) é cristalina: cada instrumento tem seu lugar.', 'The production ({studio}) is crystal clear: every instrument has its place.'),
    l('Som caro e bem cuidado, feito para soar bem no rádio e nos fones.', 'An expensive, careful sound, made to shine on radio and headphones.'),
    l('A mixagem é um espetáculo à parte — detalhes aparecem a cada audição.', 'The mix is a show of its own — details appear with every listen.'),
  ],
  originality: [
    l('Não soa como nada que se ouve hoje nas rádios.', 'It sounds like nothing on the radio today.'),
    l('Corre riscos de verdade e quase sempre ganha a aposta.', 'It takes real risks and almost always wins the bet.'),
    l('Um disco que pode mudar o que vem depois no gênero.', 'A record that may change what comes next in the genre.'),
  ],
  cohesion: [
    l('Funciona como obra inteira: não há faixa sobrando.', 'It works as a whole: no track is wasted.'),
    l('A sequência das faixas conta uma história do começo ao fim.', 'The sequencing tells a story from start to finish.'),
    l('Coeso e bem amarrado; pede para ser ouvido de uma vez.', 'Cohesive and tight; begs to be heard in one go.'),
  ],
};

const LOW: Record<Aspect, L[]> = {
  melody: [
    l('Falta um refrão que fique na cabeça.', 'It lacks a chorus that sticks.'),
    l('As melodias andam em círculos e raramente decolam.', 'The melodies go in circles and rarely take off.'),
    l('Muita atmosfera, pouca canção.', 'Plenty of atmosphere, not much song.'),
  ],
  lyrics: [
    l('As letras{theme} não passam do lugar-comum.', 'The lyrics{theme} never get past cliché.'),
    l('Rimas fáceis e frases de efeito que não dizem nada.', 'Easy rhymes and slogans that say nothing.'),
    l('Dá para pular o encarte: a escrita é o ponto fraco.', 'Skip the sleeve: the writing is the weak spot.'),
  ],
  performance: [
    l('{lead} soa cansado(a) em boa parte das faixas.', '{lead} sounds tired on much of the record.'),
    l('A banda parece tocar no piloto automático.', 'The band seems to be on autopilot.'),
    l('Tomadas burocráticas; falta energia de quem acredita no que canta.', 'Bureaucratic takes; missing the energy of belief.'),
  ],
  production: [
    l('A produção ({studio}) é magra e embolada.', 'The production ({studio}) is thin and muddy.'),
    l('Som datado, como se tivesse sido gravado às pressas.', 'A dated sound, as if recorded in a rush.'),
    l('A mixagem enterra a voz e achata tudo.', 'The mix buries the vocals and flattens everything.'),
  ],
  originality: [
    l('Tudo aqui já foi feito — e melhor.', 'Everything here has been done before — and better.'),
    l('Segue a fórmula do momento sem acrescentar nada.', 'Follows the formula of the moment without adding anything.'),
    l('Seguro demais: nenhum risco, nenhuma surpresa.', 'Too safe: no risks, no surprises.'),
  ],
  cohesion: [
    l('Parece uma coletânea de sobras, não um disco.', 'It feels like a pile of leftovers, not a record.'),
    l('Altos e baixos demais: as boas faixas se perdem no meio do enchimento.', 'Too many ups and downs: the good tracks get lost among the filler.'),
    l('Falta um fio condutor entre as canções.', 'There is no thread tying the songs together.'),
  ],
};

const VERDICT: [number, L[]][] = [
  [8.5, [l('Veredito: essencial. Compre, ouça, empreste — e peça de volta.', 'Verdict: essential. Buy it, play it, lend it — and ask for it back.'), l('Veredito: um dos discos do ano.', 'Verdict: one of the records of the year.')]],
  [7, [l('Veredito: recomendado, sobretudo para quem já é fã.', 'Verdict: recommended, especially for existing fans.'), l('Veredito: vale cada centavo.', 'Verdict: worth every penny.')]],
  [5.5, [l('Veredito: bom para ouvir uma vez; o próximo precisa ousar mais.', 'Verdict: good for a listen; the next one needs to dare more.'), l('Veredito: correto, sem brilho.', 'Verdict: decent, without shine.')]],
  [4, [l('Veredito: só para colecionadores.', 'Verdict: for completists only.'), l('Veredito: decepcionante.', 'Verdict: disappointing.')]],
  [0, [l('Veredito: passe longe.', 'Verdict: stay away.'), l('Veredito: um tropeço que vai custar caro.', 'Verdict: a stumble that will cost dearly.')]],
];

const TYPE_NAME: Record<string, L> = { single: l('single', 'single'), ep: l('EP', 'EP'), album: l('disco', 'album'), compilation: l('coletânea', 'compilation'), live: l('disco ao vivo', 'live album') };

function ordinal(n: number): L {
  return { pt: `${n}º`, en: n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th` };
}

/** Parágrafos da crítica (montados na hora a partir dos números guardados). */
export function reviewBody(s: GameState, rel: Release, rv: Review): L[] {
  if (!rv.aspects) return [];
  const act = s.acts[rel.actId];
  const h = ((rv.seed ?? hashString(rel.id + rv.critic)) ^ hashString(rv.critic)) >>> 0;
  const out: L[] = [];
  const ctx = (rv.ctx ?? { nth: 1 }) as ReviewCtx;
  const genre = act ? genreById[act.genre]?.name ?? l(act.genre, act.genre) : l('música', 'music');
  const tname = TYPE_NAME[rel.type] ?? TYPE_NAME.album;
  const lead = act ? (act.members.map((id) => s.persons[id]).find((p) => p && (p.role === 'vocal' || p.role === 'mc')) ?? s.persons[act.leaderId ?? act.members[0]]) : undefined;
  const leadName = lead?.name ?? act?.name ?? '';
  const song0 = s.songs[rel.songs[0]];
  const studio = song0?.studioTier !== undefined ? STUDIO_TIERS[song0.studioTier]?.name : undefined;
  const theme = rel.songs.map((id) => s.songs[id]?.theme).find(Boolean);
  const vars = (x: L): L => ({
    pt: x.pt.replace('{lead}', leadName).replace('{studio}', studio?.pt ?? 'estúdio').replace('{theme}', theme ? ` (sobre ${theme.pt.toLowerCase()})` : ''),
    en: x.en.replace('{lead}', leadName).replace('{studio}', studio?.en ?? 'studio').replace('{theme}', theme ? ` (about ${theme.en.toLowerCase()})` : ''),
  });
  // abertura: contexto da carreira
  if (ctx.nth === 1) out.push(rv.score >= 7
    ? fmtL(l('{a} estreia com um {t} de {g} que já chega dizendo a que veio.', '{a} debuts with a {g} {t} that arrives with something to say.'), { a: act?.name ?? '', t: tname, g: genre })
    : rv.score >= 5
      ? fmtL(l('{a} estreia com um {t} de {g} promissor, ainda procurando a própria voz.', '{a} debuts with a promising {g} {t}, still looking for its own voice.'), { a: act?.name ?? '', t: tname, g: genre })
      : fmtL(l('A estreia de {a} no {g} chega cercada de expectativa — e tropeça.', '{a}\'s {g} debut arrives with expectations — and stumbles.'), { a: act?.name ?? '', g: genre }));
  else if (ctx.prev && ctx.prevPeak !== undefined && ctx.prevPeak <= 10) out.push(fmtL(l('Depois do sucesso de "{p}" (#{k}), {a} chega ao {n} lançamento com a pressão de quem precisa repetir a dose.', 'After the success of "{p}" (#{k}), {a} reaches their {n} release under pressure to do it again.'), { p: ctx.prev, k: ctx.prevPeak, a: act?.name ?? '', n: ordinal(ctx.nth) }));
  else if (ctx.prev && ctx.prevAvg !== undefined && ctx.prevAvg < 5) out.push(fmtL(l('{a} tenta se recuperar da recepção fria de "{p}" neste {n} lançamento.', '{a} tries to bounce back from the cold reception of "{p}" on this {n} release.'), { a: act?.name ?? '', p: ctx.prev, n: ordinal(ctx.nth) }));
  else out.push(fmtL(l('No {n} lançamento, {a} segue explorando o {g}.', 'On their {n} release, {a} keeps exploring {g}.'), { a: act?.name ?? '', n: ordinal(ctx.nth), g: genre }));
  // gosto do crítico
  if (rv.fav === 1) out.push(fmtL(l('Para quem, como esta coluna, vive de {g}, o disco tem um apelo extra.', 'For someone who, like this column, lives on {g}, the record has extra appeal.'), { g: genre }));
  if (rv.fav === -1) out.push(fmtL(l('O {g} nunca foi a praia desta revista, e é difícil fingir o contrário.', '{g} was never this magazine\'s thing, and it is hard to pretend otherwise.'), { g: genre }));
  // melhor e pior aspecto
  const sorted = [...ASPECTS].filter((k) => rel.songs.length > 1 || k !== 'cohesion').sort((a, b) => rv.aspects![b] - rv.aspects![a]);
  const top = sorted[0];
  const low = sorted[sorted.length - 1];
  if (rv.aspects[top] >= 6) out.push(vars(pick(HIGH[top], h, 3)));
  else if (rv.aspects[top] >= 4) out.push(fmtL(l('O que se salva é {x}, o único aspecto acima da média do disco.', 'What survives is {x}, the only aspect above the record\'s average.'), { x: { pt: ASPECT_NAMES[top].pt.toLowerCase(), en: ASPECT_NAMES[top].en.toLowerCase() } }));
  if (sorted[1] && rv.aspects[sorted[1]] >= 7.5) out.push(vars(pick(HIGH[sorted[1]], h, 7)));
  if (rv.aspects[low] < 5.5) out.push(vars(pick(LOW[low], h, 11)));
  const low2 = sorted[sorted.length - 2];
  if (low2 && low2 !== top && rv.aspects[low2] < 3.5) out.push(vars(pick(LOW[low2], h, 13)));
  else if (rv.aspects[low] < 6.5) out.push(fmtL(l('Se há um senão, é {x}: correto, mas abaixo do resto.', 'If there is a catch, it is {x}: fine, but below the rest.'), { x: { pt: ASPECT_NAMES[low].pt.toLowerCase(), en: ASPECT_NAMES[low].en.toLowerCase() } }));
  // faixas
  if (rv.best) out.push(rv.worst
    ? fmtL(l('O destaque é "{b}"; já "{w}" poderia ter ficado na gaveta.', 'The standout is "{b}"; "{w}" could have stayed in the drawer.'), { b: rv.best, w: rv.worst })
    : fmtL(l('O destaque é "{b}".', 'The standout is "{b}".'), { b: rv.best }));
  // comparação com o rival do ano
  if (ctx.rival && ctx.rivalAct) out.push(ctx.rivalBetter
    ? fmtL(l('No ano de "{r}", de {ra}, a régua está alta — e este fica um degrau abaixo.', 'In the year of {ra}\'s "{r}", the bar is high — and this falls a step short.'), { r: ctx.rival, ra: ctx.rivalAct })
    : fmtL(l('Num ano em que {ra} lançou "{r}", este ainda sai na frente.', 'In a year when {ra} released "{r}", this one still comes out ahead.'), { r: ctx.rival, ra: ctx.rivalAct }));
  // mainstream x underground
  const pos = act?.positioning ?? 50;
  if (pos > 70 && rv.score < 6) out.push(l('Há concessões demais ao rádio; o artista parece pedir licença para existir.', 'Too many concessions to radio; the artist seems to ask permission to exist.'));
  if (pos < 30 && rv.score >= 7) out.push(l('Longe das paradas, mas é desse tipo de disco que a cena vive.', 'Far from the charts, but this is the kind of record a scene lives on.'));
  const vb = VERDICT.find(([min]) => rv.score >= min)![1];
  out.push(pick(vb, h, 17));
  return out;
}

/** Nota dos fãs (0..10): mais melodia e interpretação, menos originalidade. */
export function fanScore(s: GameState, rel: Release): number {
  const a = releaseAspects(s, rel);
  const act = s.acts[rel.actId];
  const v = (a.melody * 1.4 + a.performance * 1.1 + a.production * 0.8 + a.lyrics * 0.6 + a.originality * 0.3) / 4.2 / 10 + ((act?.fame ?? 0) - 30) / 80 + ((act?.positioning ?? 50) - 50) / 120;
  return Math.round(clamp(v, 0.5, 10) * 10) / 10;
}

export function stars(score: number): string {
  const n = Math.round(score / 2);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}
