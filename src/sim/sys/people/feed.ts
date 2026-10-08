// Feed de redes sociais simulado: a partir de ~2004, linha do tempo com posts de fãs, haters,
// jornalistas e artistas sobre lançamentos, shows e escândalos, com sentimento medido. Antes disso,
// cartas de fãs e colunas de fofoca. O burburinho mexe no humor dos artistas e no apelo.

import type { Rng } from '../../../core/rng';
import { CITIES, cityById, l, type L } from '../../../data/world';
import { registerMod, registerSimHook } from '../../ext4';
import type { Act, GameState } from '../../types';
import { fmtL, playerActs } from '../../util';
import { P, addPost, socialEra, type FeedPost } from './state';
import { thoughtAll } from './thoughts';

const HANDLES = ['vinylkid', 'sonicbloom', 'nightdrive', 'popcritic', 'bassface', 'lofi_lena', 'mixtapemaria', 'riffraff', 'echo_echo', 'stagedivers', 'neonheart', 'grooveboy', 'midnightrádio', 'b_side', 'loudandclear'];
const LETTER_NAMES = ['Maria', 'João', 'Ruth', 'Pedro', 'Alice', 'Tomás', 'Elena', 'George', 'Lúcia', 'Frank'];

const FAN_POS: L[] = [
  l('"{t}" não sai da minha cabeça. {a} acertou demais.', '"{t}" is stuck in my head. {a} nailed it.'),
  l('Ouvi "{t}" dez vezes seguidas. Obra-prima.', 'Played "{t}" ten times straight. Masterpiece.'),
  l('{a} é a melhor coisa que aconteceu este ano.', '{a} is the best thing to happen this year.'),
];
const HATER: L[] = [
  l('"{t}"? Sério? {a} já foi melhor.', '"{t}"? Really? {a} used to be better.'),
  l('Mais uma de {a} igual a todas as outras.', 'Another {a} track that sounds like all the rest.'),
  l('Não entendo o hype de {a}.', 'I don\'t get the {a} hype.'),
];
const PRESS: L[] = [
  l('Crítica: "{t}" mostra {a} em busca de um som próprio.', 'Review: "{t}" finds {a} chasing its own sound.'),
  l('{a} lança "{t}" e divide a crítica.', '{a} releases "{t}" and splits the critics.'),
];
const LETTERS: L[] = [
  l('"Querido(a) {a}, ouvi \'{t}\' no rádio e chorei. Obrigada." — {n}, {c}', '"Dear {a}, I heard \'{t}\' on the radio and cried. Thank you." — {n}, {c}'),
  l('"Comprei o disco de {a} com a mesada. Valeu cada centavo." — {n}, {c}', '"Bought {a}\'s record with my allowance. Worth every penny." — {n}, {c}'),
];
const GOSSIP: L[] = [
  l('Dizem que {a} anda brigando nos bastidores...', 'Word is {a} has been fighting backstage...'),
  l('Vista em {c}: integrante de {a} em jantar misterioso.', 'Spotted in {c}: a member of {a} at a mysterious dinner.'),
];

function handle(r: Rng): string {
  return `@${r.pick(HANDLES)}${r.int(1, 99)}`;
}

function sentimentFor(q: number, r: Rng): number {
  return Math.max(-1, Math.min(1, (q - 50) / 35 + r.normal(0, 0.3)));
}

export function postAbout(s: GameState, r: Rng, act: Act, title: string, q: number): void {
  const p = { a: act.name, t: title, n: r.pick(LETTER_NAMES), c: cityById[act.city]?.name ?? l(act.city) };
  const sent = sentimentFor(q, r);
  const reach = Math.round(50 + act.fame * act.fame * 3);
  const haters = s.fandoms[act.id]?.haters ?? 0;
  if (socialEra(s.year)) {
    addPost(s, { author: handle(r), role: 'fan', text: fmtL(r.pick(FAN_POS), p), sentiment: Math.max(0.2, sent), actId: act.id, likes: Math.round(reach * r.float(0.5, 1.5)) });
    if (sent < 0.3 || haters > 50 || r.chance(0.4)) addPost(s, { author: handle(r), role: 'hater', text: fmtL(r.pick(HATER), p), sentiment: Math.min(-0.3, sent - 0.5), actId: act.id, likes: Math.round(reach * r.float(0.2, 1.1)) });
    if (act.fame > 15) addPost(s, { author: r.pick(['@revistapop', '@thewire_music', '@sonsdobrasil', '@nmeish']), role: 'journalist', text: fmtL(r.pick(PRESS), p), sentiment: sent * 0.6, actId: act.id, likes: Math.round(reach * 0.4) });
  } else {
    if (sent > -0.2) addPost(s, { author: fmtL(l('Carta de {n}', 'Letter from {n}'), p).pt, role: 'letter', text: fmtL(r.pick(LETTERS), p), sentiment: Math.max(0.3, sent), actId: act.id, likes: 0 });
    if (sent < 0 || r.chance(0.3)) addPost(s, { author: l('Coluna de fofocas', 'Gossip column').pt, role: 'gossip', text: fmtL(r.pick(GOSSIP), p), sentiment: -0.2, actId: act.id, likes: 0 });
  }
}

registerSimHook('launch', 'people-feed', (s, r, arg) => {
  const rel = arg.release;
  if (!rel) return;
  const act = s.acts[rel.actId];
  if (!act) return;
  if (rel.owner === 'player') postAbout(s, r, act, rel.title, rel.q);
  else if (act.fame > 45 && r.chance(0.25)) postAbout(s, r, act, rel.title, rel.q);
});

registerSimHook('show', 'people-feed', (s, r, arg) => {
  const sh = arg.show;
  const act = sh ? s.acts[sh.actId] : undefined;
  if (!sh || !act || act.owner !== 'player' || !r.chance(0.35)) return;
  const ratio = sh.sold / Math.max(1, sh.capacity);
  const city = cityById[sh.cityId]?.name ?? l(sh.cityId);
  if (socialEra(s.year)) {
    addPost(s, ratio > 0.8
      ? { author: handle(r), role: 'fan', text: fmtL(l('Show de {a} em {c} foi histórico!! 🔥', '{a} in {c} was historic!! 🔥'), { a: act.name, c: city }), sentiment: 0.8, actId: act.id, likes: Math.round(sh.sold * 0.3) }
      : { author: handle(r), role: 'hater', text: fmtL(l('Casa vazia pra {a} em {c}. Acabou?', 'Empty house for {a} in {c}. Is it over?'), { a: act.name, c: city }), sentiment: -0.5, actId: act.id, likes: Math.round(sh.capacity * 0.05) });
  } else if (ratio > 0.8) {
    addPost(s, { author: l('Jornal local', 'Local paper').pt, role: 'journalist', text: fmtL(l('{a} lota o teatro em {c}.', '{a} packs the theater in {c}.'), { a: act.name, c: city }), sentiment: 0.6, actId: act.id, likes: 0 });
  }
});

registerSimHook('week', 'people-feed', (s, r) => {
  const st = P(s);
  for (const c of s.crises) {
    const key = `feed:${c.id}`;
    if (st.seenCrises[key]) continue;
    st.seenCrises[key] = 1;
    const act = s.acts[c.actId];
    if (!act) continue;
    addPost(s, socialEra(s.year)
      ? { author: handle(r), role: 'hater', text: fmtL(l('{a} cancelado(a)? {t}', '{a} cancelled? {t}'), { a: act.name, t: c.text }), sentiment: -0.8, actId: act.id, likes: Math.round(500 + c.severity * 40 + act.fame * 30) }
      : { author: l('Coluna de fofocas', 'Gossip column').pt, role: 'gossip', text: c.text, sentiment: -0.6, actId: act.id, likes: 0 });
  }
});

/** Sentimento médio recente de um ato (−1..1) e quantos posts. */
export function sentimentOf(s: GameState, actId: string, weeks = 8): { avg: number; n: number } {
  const list = P(s).feed.filter((p) => p.actId === actId && s.week - p.week <= weeks);
  if (!list.length) return { avg: 0, n: 0 };
  let w = 0;
  let t = 0;
  for (const p of list) {
    const weight = 1 + Math.log10(1 + p.likes);
    t += p.sentiment * weight;
    w += weight;
  }
  return { avg: t / w, n: list.length };
}

export function feedMonth(s: GameState, r: Rng): void {
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    // conversa espontânea
    if (r.chance(Math.min(0.8, 0.1 + act.fame / 90))) {
      const last = act.releases.length ? s.releases[act.releases[act.releases.length - 1]] : undefined;
      if (last) postAbout(s, r, act, last.title, last.q + (act.momentum - 50) / 3);
    }
    const sent = sentimentOf(s, id, 5);
    if (sent.n < 2) continue;
    if (socialEra(s.year)) {
      if (sent.avg < -0.25) thoughtAll(s, id, 'haters');
      else if (sent.avg > 0.3) thoughtAll(s, id, 'fans_love');
    } else {
      const recent = P(s).feed.filter((p) => p.actId === id && s.week - p.week <= 5);
      if (recent.some((p) => p.role === 'letter')) thoughtAll(s, id, 'fan_letters');
      if (recent.some((p) => p.role === 'gossip')) thoughtAll(s, id, 'gossip');
    }
  }
  void CITIES;
}

registerMod('appeal', 'people-feed', (s, value, ctx) => {
  const act = ctx.release ? s.acts[ctx.release.actId] : ctx.act;
  if (!act || act.owner !== 'player' || !socialEra(s.year)) return null;
  const sent = sentimentOf(s, act.id, 6);
  if (sent.n < 2 || Math.abs(sent.avg) < 0.15) return null;
  return { value: value * (1 + Math.max(-0.04, Math.min(0.04, sent.avg * 0.05))), label: l('Burburinho nas redes', 'Social media buzz') };
});

export function feedFor(s: GameState, actId?: string, max = 40): FeedPost[] {
  return P(s).feed.filter((p) => !actId || p.actId === actId).slice(-max).reverse();
}
