// Cenas locais como redes vivas (rodada 12): cada cidade onde o selo atua (matriz, filiais e cenas
// históricas vivas) tem uma pequena rede — uma casa onde artistas surgem, um produtor/atravessador
// influente, um veículo de mídia (da rádio local ao feed curado, conforme a época) e um público com
// gosto próprio — e uma tensão entre autenticidade e comercialização. Investir cedo faz a cena crescer;
// explorar demais faz a cena virar as costas e fortalece um selo concorrente local (um selo de verdade
// do mundo). Abrir filial = escolher com quem construir presença (parceiro na rede), não um bônus fixo.

import { Rng, clamp } from '../../core/rng';
import { cityById, genreById, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import type { GameState, Label } from '../types';
import { fmtL, money, nextId, notify, playerActs, post, remember } from '../util';
import { spawnProceduralAct } from '../worldgen';
import { HIST_SCENES, sceneStage, type HistScene } from './world4/scenes';

export type Node = 'venue' | 'producer' | 'media';
export const NODES: Node[] = ['venue', 'producer', 'media'];
export type Aud = 'purist' | 'trend' | 'dance';
export type Harvest = 'sponsor' | 'mainstream';

export interface Net {
  city: string; genre: string; health: number; exploit: number; auth: number;
  ties: Record<Node, number>; names: Record<Node, string>; aud: Aud;
  rival?: string; rivalStr: number; partner?: Node; partnerW: number; push: number;
  cult: Partial<Record<Node, number>>; harvestW: number; rejectW: number; born: number;
}
interface Scene12 { nets: Record<string, Net>; asked: Record<string, number> }
declare module '../ext4' { interface Ext4 { scene12: Scene12 } }
registerExt4('scene12', () => ({ nets: {}, asked: {} }));
export const scene12 = (s: GameState): Scene12 => {
  const x = s.x4 as unknown as { scene12?: Scene12 };
  x.scene12 ??= { nets: {}, asked: {} };
  x.scene12.asked ??= {};
  return x.scene12;
};

export const AUD_NAME: Record<Aud, L> = { purist: l('purista', 'purist'), trend: l('caçador de novidade', 'trend-chaser'), dance: l('de pista', 'dancefloor') };
export const AUD_DESC: Record<Aud, L> = {
  purist: l('Valoriza autenticidade: cultivar a casa e o produtor rende mais; explorar a cena dói em dobro.', 'Values authenticity: cultivating the venue and producer pays more; exploiting the scene hurts twice as much.'),
  trend: l('Segue o hype: a mídia pesa mais e tolera o comercial, mas a cena esfria rápido se ninguém alimenta.', 'Follows the hype: media weighs more and tolerates commerce, but the scene cools fast if nobody feeds it.'),
  dance: l('Quer pista cheia: a casa de shows é o coração — shows rendem mais com ela do seu lado.', 'Wants a packed floor: the venue is the heart — shows earn more with it on your side.'),
};
export const NODE_ROLE: Record<Node, L> = {
  venue: l('onde artistas surgem; melhora shows na cidade e revela talentos', 'where artists emerge; boosts shows in the city and reveals talent'),
  producer: l('produtor/atravessador; melhora o apelo dos discos de atos da cidade', 'producer/middleman; boosts the appeal of records by city acts'),
  media: l('veículo local; dá fama aos atos da cidade e apelo aos discos', 'local outlet; gives fame to city acts and appeal to records'),
};

const h01 = (str: string): number => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return ((h >>> 0) % 10007) / 10007; };
const pickH = <T>(arr: T[], key: string): T => arr[Math.floor(h01(key) * arr.length) % arr.length];
const VENUES = ['Porão 77', 'Blue Door', 'Lanterna', 'Estação Central', 'Velvet Room', 'Farol', 'Quintal', 'The Cave', 'Galpão Sul', 'Moonlight', 'Casa Amarela', 'Basement'];
const PEOPLE = ['Lou Marino', 'Dina Okafor', 'Teo Valença', 'Marga Lind', 'Ray Castell', 'Iko Tanaka', 'Bia Moura', 'Sol Ferreira', 'Jojo Kessler', 'Nina Abreu', 'Wes Harlan', 'Luz Ortega'];
const OUTLETS = ['Sintonia', 'Ponto Alto', 'Underground', 'Noite Adentro', 'Frequência', 'Vitrola', 'Sinal Livre', 'Cultura Viva', 'Batida', 'Eco'];

/** Tipo de cada nó conforme o ano (nada do futuro). */
export function nodeKind(s: GameState, n: Node): L {
  const y = s.year;
  if (n === 'venue') return y < 1945 ? l('Salão de baile', 'Ballroom') : y < 1965 ? l('Clube noturno', 'Nightclub') : y < 1985 ? l('Bar underground', 'Underground bar') : y < 2005 ? l('Casa de shows', 'Music venue') : l('Galpão independente', 'Independent warehouse');
  if (n === 'producer') return y < 1950 ? l('Arranjador', 'Arranger') : y < 1975 ? l('Produtor de estúdio', 'Studio producer') : y < 1995 ? l('DJ-produtor', 'DJ-producer') : y < 2025 ? l('Beatmaker', 'Beatmaker') : l('Produtora-curadora de vozes', 'Voice producer-curator');
  return y < 1950 ? l('Rádio local', 'Local radio') : y < 1981 ? l('Programa de rádio', 'Radio show') : y < 1995 ? l('Programa de TV local', 'Local TV show') : y < 2008 ? l('Blog e fórum', 'Blog and forum') : y < 2018 ? l('Canal e playlist', 'Channel and playlist') : y < 2030 ? l('Creator de vídeos curtos', 'Short-video creator') : l('Feed curado', 'Curated feed');
}

const homeOf = (s: GameState) => s.config.homeCity;
const histIn = (s: GameState, city: string): HistScene | undefined => HIST_SCENES.find((h) => h.city === city && ['rise', 'peak', 'decline'].includes(sceneStage(s, h)));
const born = (s: GameState, g: string) => !!genreById[g] && genreById[g].born <= s.year;

/** Cidades onde o selo tem (ou pode ter) rede: matriz, filiais e cenas históricas vivas. */
export function netCities(s: GameState): string[] {
  const out = new Set<string>([homeOf(s), ...(s.branches ?? []).map((b) => b.city)]);
  for (const h of HIST_SCENES) if (['rise', 'peak'].includes(sceneStage(s, h)) && cityById[h.city]) out.add(h.city);
  return [...out].filter((c) => cityById[c]);
}

function focusGenre(s: GameState, city: string): string {
  const h = histIn(s, city);
  const hg = h?.genres.find((g) => born(s, g));
  if (hg) return hg;
  const top = Object.entries(s.scenes).filter(([k]) => k.startsWith(city + ':') && born(s, k.split(':')[1])).sort((a, b) => b[1] - a[1])[0];
  if (top) return top[0].split(':')[1];
  return cityById[city]?.scenes.find((g) => born(s, g)) ?? 'pop';
}

export function netOf(s: GameState, city: string): Net {
  const st = scene12(s);
  let n = st.nets[city];
  if (!n) {
    const k = `${s.config.seed}:${city}`;
    n = st.nets[city] = {
      city, genre: focusGenre(s, city), health: histIn(s, city) ? 30 : 20, exploit: 0, auth: 50,
      ties: { venue: 5, producer: 5, media: 5 }, names: { venue: pickH(VENUES, k + 'v'), producer: pickH(PEOPLE, k + 'p'), media: pickH(OUTLETS, k + 'm') },
      aud: pickH<Aud>(['purist', 'trend', 'dance'], k + 'a'), rivalStr: 0, partnerW: -99, push: -1, cult: {}, harvestW: -99, rejectW: -99, born: s.year,
    };
  }
  return n;
}

const nodeMult = (n: Net, node: Node): number => (n.partner === node ? 1.5 : 1) * ((n.aud === 'purist' && node !== 'media') || (n.aud === 'trend' && node === 'media') || (n.aud === 'dance' && node === 'venue') ? 1.5 : 1);
export const nodeName = (s: GameState, n: Net, node: Node): L => fmtL(l('{k} {n}', '{k} {n}'), { k: nodeKind(s, node), n: n.names[node] });

export const cultivateCost = (s: GameState): number => money(s, 2000);
/** Investir num nó da rede: laço, saúde da cena (mais se ela ainda é pequena) e autenticidade. */
export function cultivate(s: GameState, city: string, node: Node): L | null {
  const n = netOf(s, city);
  if (s.week - (n.cult[node] ?? -99) < 4) return l('Você já investiu nesse contato este mês.', 'You already invested in this contact this month.');
  const c = cultivateCost(s);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `scene12:${city}:${node}`, -c, 'marketing', `Apoio à cena de ${cityById[city]?.name.pt ?? city}`);
  n.cult[node] = s.week;
  n.ties[node] = clamp(n.ties[node] + 12 * nodeMult(n, node) * (1 - n.ties[node] / 120), 0, 100);
  n.health = clamp(n.health + (n.health < 40 ? 6 : n.health < 70 ? 3 : 1), 0, 100); // cedo rende mais
  n.auth = clamp(n.auth + 3, 0, 100);
  n.exploit = Math.max(0, n.exploit - 3);
  return null;
}

export const harvestGain = (s: GameState, n: Net): number => money(s, 40 * n.health);
/** Faturar em cima da cena: patrocínio (dinheiro) ou levar o som ao mainstream (apelo por 6 meses). */
export function harvest(s: GameState, city: string, how: Harvest): L | null {
  const n = netOf(s, city);
  if (n.health < 20) return l('A cena ainda é pequena demais para render.', 'The scene is still too small to cash in on.');
  if (s.week - n.harvestW < 8) return l('Você acabou de explorar essa cena: espere dois meses.', 'You just cashed in on this scene: wait two months.');
  const hurt = n.aud === 'purist' ? 1.5 : n.aud === 'trend' ? 0.7 : 1;
  n.harvestW = s.week;
  if (how === 'sponsor') {
    post(s, `scene12h:${city}`, harvestGain(s, n), 'sales', `Patrocínio na cena de ${cityById[city]?.name.pt ?? city}`);
    n.exploit = clamp(n.exploit + 22, 0, 100);
    n.auth = clamp(n.auth - 10 * hurt, 0, 100);
  } else {
    n.push = s.week + 26;
    n.exploit = clamp(n.exploit + 28, 0, 100);
    n.auth = clamp(n.auth - 14 * hurt, 0, 100);
    n.health = clamp(n.health + 5, 0, 100);
    s.scenes[`${city}:${n.genre}`] = (s.scenes[`${city}:${n.genre}`] ?? 0) + 1;
  }
  return null;
}

export const hasBranch = (s: GameState, city: string): boolean => (s.branches ?? []).some((b) => b.city === city);
/** Filial: escolher com quem construir presença. Troca só uma vez por ano. */
export function choosePartner(s: GameState, city: string, node: Node): L | null {
  if (!hasBranch(s, city)) return l('Só uma filial na cidade pode firmar parceria.', 'Only a branch in the city can form a partnership.');
  const n = netOf(s, city);
  if (n.partner === node) return l('Esse já é o parceiro da filial.', 'That is already the branch partner.');
  if (n.partner && s.week - n.partnerW < 52) return fmtL(l('Parceria recente: troque em {w} semanas.', 'Recent partnership: change in {w} weeks.'), { w: 52 - (s.week - n.partnerW) });
  if (n.partner) n.ties[n.partner] = clamp(n.ties[n.partner] - 20, 0, 100); // o antigo parceiro se sente traído
  n.partner = node;
  n.partnerW = s.week;
  n.ties[node] = clamp(n.ties[node] + 10, 0, 100);
  remember(s, 'scene12_partner', fmtL(l('A filial de {c} fecha parceria com {x}.', 'The {c} branch partners with {x}.'), { c: cityById[city].name, x: nodeName(s, n, node) }), { important: true });
  return null;
}

const RIVAL_WORDS = ['Raiz', 'Quintal', 'Subsolo', 'Garagem', 'Esquina', 'Brasa', 'Maré', 'Concreto', 'Vila', 'Faísca'];
function strengthenRival(s: GameState, n: Net, r: Rng): Label {
  let lb = n.rival ? s.labels[n.rival] : undefined;
  if (!lb || !lb.active) {
    lb = Object.values(s.labels).filter((x) => x.active && x.city === n.city && !x.parentLabel).sort((a, b) => a.reputation - b.reputation)[0];
    if (!lb) {
      const id = nextId(s, 'lb');
      const name = `${r.pick(RIVAL_WORDS)} ${cityById[n.city].name.pt.split(' ')[0]} Discos`;
      lb = s.labels[id] = { id, name, family: 'B', city: n.city, founded: s.year, focus: [n.genre], cash: money(s, 150000), reputation: 25, roster: [], active: true,
        aggression: 0.6, strategy: 'niche', territories: [cityById[n.city].market], revenueYear: 0, revenueLastYear: 0, procedural: true, archetype: 'scene_hunter' };
    }
    n.rival = lb.id;
  }
  lb.reputation = clamp(lb.reputation + 4, 0, 100);
  lb.cash += money(s, 20000);
  if (!lb.focus.includes(n.genre)) lb.focus.push(n.genre);
  return lb;
}

registerMod('appeal', 'scene12', (s, v, c) => {
  const a = c.act, rel = c.release;
  if (!a || !rel) return null;
  const n = scene12(s).nets[a.city];
  if (!n) return null;
  if (n.rival && rel.owner === n.rival && n.rivalStr > 0) return { value: v * (1 + n.rivalStr / 500), label: l('Selo local apoiado pela cena', 'Local label backed by the scene') };
  if (rel.owner !== 'player' && !a.playerBand) return null;
  let k = 1 + n.ties.producer * 0.0008 * nodeMult(n, 'producer') + n.ties.media * 0.0005 * nodeMult(n, 'media') + (n.auth - 50) / 1000 - n.rivalStr / 600;
  if (s.week < n.push && a.genre === n.genre) k += 0.15;
  return Math.abs(k - 1) < 0.003 ? null : { value: v * k, label: l('Rede da cena local', 'Local scene network') };
});

registerMod('showRevenue', 'scene12', (s, v, c) => {
  const n = c.cityId ? scene12(s).nets[c.cityId] : undefined;
  if (!n || !c.act || (c.act.owner !== 'player' && !c.act.playerBand)) return null;
  const k = 1 + n.ties.venue * 0.0012 * nodeMult(n, 'venue') - n.rivalStr / 800;
  return Math.abs(k - 1) < 0.003 ? null : { value: v * k, label: l('Casa de shows parceira', 'Partner venue') };
});

function monthNet(s: GameState, n: Net): void {
  const r = Rng.fromSeed(`${s.config.seed}:scene12:${s.week}:${n.city}`);
  const cname = cityById[n.city].name;
  if (!born(s, n.genre)) n.genre = focusGenre(s, n.city);
  for (const node of NODES) {
    if (n.partner === node) n.ties[node] = clamp(n.ties[node] + 3, 0, 100);
    else if (s.week - (n.cult[node] ?? -99) > 12) n.ties[node] = Math.max(0, n.ties[node] - (n.partner ? 1 : 0.5));
  }
  const h = histIn(s, n.city);
  const st = h ? sceneStage(s, h) : undefined;
  const hist = st === 'rise' ? 2 : st === 'peak' ? 1 : st === 'decline' ? -1.5 : 0;
  const avg = (n.ties.venue + n.ties.producer + n.ties.media) / 3;
  n.health = clamp(n.health + avg / 60 - n.exploit / 30 + hist - (n.aud === 'trend' ? 0.7 : 0) + (25 - n.health) * 0.03, 0, 100);
  const key = `${n.city}:${n.genre}`;
  s.scenes[key] = (s.scenes[key] ?? 0) + n.health / 500;
  n.exploit = Math.max(0, n.exploit - 4);
  n.auth = clamp(n.auth + (50 - n.auth) * 0.04, 0, 100);
  // fama via mídia local
  if (n.ties.media > 10) for (const id of playerActs(s)) { const a = s.acts[id]; if (a?.city === n.city) a.fame = clamp(a.fame + n.ties.media / 400, 0, 100); }
  // a cena vira as costas
  if ((n.exploit >= 60 || n.auth <= 20) && s.week - n.rejectW > 52) {
    n.rejectW = s.week;
    for (const node of NODES) n.ties[node] = Math.max(0, n.ties[node] - 25);
    n.health = clamp(n.health - 10, 0, 100);
    n.auth = clamp(n.auth - 8, 0, 100);
    n.rivalStr = clamp(n.rivalStr + 30, 0, 100);
    const lb = strengthenRival(s, n, r);
    const t = fmtL(l('A cena de {c} vira as costas para o selo: "vendidos!". {x} e {p} somem das suas ligações, e {lb} vira o selo da cena.', 'The {c} scene turns its back on the label: "sellouts!". {x} and {p} stop taking your calls, and {lb} becomes the scene\'s label.'), { c: cname, x: nodeName(s, n, 'venue'), p: n.names.producer, lb: lb.name });
    remember(s, 'scene12_reject', t, { important: true });
    notify(s, t, 'bad');
  }
  n.rivalStr = clamp(n.rivalStr + (n.auth < 40 ? 2 : n.auth > 60 ? -2 : 0), 0, 100);
  if (n.rivalStr >= 50 && r.chance(0.15)) {
    const node = NODES.slice().sort((a, b) => n.ties[b] - n.ties[a])[0];
    n.ties[node] = Math.max(0, n.ties[node] - 10);
    const lb = strengthenRival(s, n, r);
    notify(s, fmtL(l('{lb} seduz {x} em {c}: a concorrência local cresce.', '{lb} woos {x} in {c}: local competition grows.'), { lb: lb.name, x: nodeName(s, n, node), c: cname }), 'bad');
  }
  // talentos surgem na casa
  if (born(s, n.genre) && r.chance((n.ties.venue / 250) * (n.health / 100))) {
    const a = spawnProceduralAct(s, r, { city: n.city, genre: n.genre });
    a.momentum = clamp(a.momentum + 15, 0, 100);
    s.knowledge[a.id] ??= { actId: a.id, degree: 2, stage: 'monitoring', bias: r.normal(0, 6), updatedWeek: s.week, source: 'scene12' };
    remember(s, 'scene12_emerge', fmtL(l('{a} desponta no {x} ({c}) — e o dono da casa ligou primeiro para você.', '{a} breaks out at {x} ({c}) — and the owner called you first.'), { a: a.name, x: nodeName(s, n, 'venue'), c: cname }), { actId: a.id });
  }
}

registerSimHook('month', 'scene12', (s) => {
  const st = scene12(s);
  for (const c of netCities(s)) netOf(s, c);
  for (const n of Object.values(st.nets)) {
    if (!cityById[n.city]) continue;
    monthNet(s, n);
  }
  for (const b of s.branches ?? []) {
    const n = st.nets[b.city];
    if (n && !n.partner && st.asked[b.city] === undefined) {
      st.asked[b.city] = s.week;
      notify(s, fmtL(l('Filial em {c}: escolha com quem construir presença (casa, produtor ou mídia) em Mundo → Cenas locais.', 'Branch in {c}: choose whom to build presence with (venue, producer or media) under World → Local scenes.'), { c: cityById[b.city].name }), 'event');
    }
  }
});
