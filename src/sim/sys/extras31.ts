// R31 · onda 4 (N) — EXTRAS (plano-pagina.md: "Bandas de filmes, séries e animações", "Homenagem à família Fossati",
// "Arara e o filme", "Referências da cultura pop", "Memes, bolhas e fracassos", "Demais pedidos").
//  - Conquistas novas: Run completa (1889–2040), relíquia mítica, presente que virou relíquia, casa em três épocas,
//    Famiglia; secretas (ovos): Edison (todos os ovos dele) e "Saída da tela" (contratar uma banda de ficção).
//  - Ovos do Edison: Tone Test (1915–25), o último freguês dos cilindros (antes de 1931), o "Mary" no fonógrafo da Sede.
//  - Bandas de ficção (src/data/fiction31.ts) entram no mundo como artistas normais no ano em que a história se passa;
//    na estreia da obra, notícia e pico de fama. Interruptor `fic31`.
//  - Cultura pop, memes, bolhas e fracassos (src/data/pop31.ts): notícia na virada do mês, com o controle central de
//    frequência (`pop31.freq`), de tom (`pop31.tone`) e "humor em situações sérias" (`pop31.serio`).
//  - Arara Trips (logística de turnê com o jeito da época), a arara mascote, o filme "L'educazione della nonna" (2027,
//    trilha sonora para um artista seu) e a praça Efro e Lucia Fossati (placa clicável na cidade).
// Geração só aqui, na virada do mês (a tela só lê). Sorte pura por chave (Rng.fromSeed) — não mexe nos fluxos dos outros.
import { Rng, clamp } from '../../core/rng';
import { FICTION31, type Fiction31 } from '../../data/fiction31';
import { homage31 } from '../../data/homage31';
import { POP31, type Pop31 } from '../../data/pop31';
import { REALNAMES31 } from '../../data/realnames31';
import { cityById, genreById, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { registerSwitch, sw } from '../r31/switches';
import { CO31, ME31, relicHolder31, relicTierOf31 } from '../r31/relic31';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post, yearOfWeek } from '../util';
import { spawnProceduralAct } from '../worldgen';
import { RULES27, eg27, eggFeat27, eggFire27, markEgg27, presence27 } from './eggs27';
import { famMet31 } from './fossati31';
import { goodById, owned } from './goods8';
import { kin15 } from './kin15';
import { ACHIEVEMENTS, achById, type AchievementDef } from './live/achievements';
import { REAL_ALL, dedupKey27 } from './realworld';
import { relics } from './relics9';

// ================================================================ estado

export interface X31St {
  /** referência de cultura pop → semana em que saiu */
  pop: Record<string, number>;
  /** banda de ficção → id do ato no mundo */
  fic: Record<string, string>;
  /** estreia da obra já noticiada */
  prem: Record<string, number>;
  /** última semana com morte de artista seu (memes não aparecem perto de tragédia) */
  grief?: number;
  /** Arara Trips contratada até a semana */
  arara?: number;
  /** filme de 2027: oferta aberta / trilha feita (ato) */
  film?: { open?: number; act?: string };
  /** bolha do NFT: token vendido (semana) */
  nft?: number;
  /** diário das referências (mais recente primeiro): [ano, mês, id] */
  log: [number, number, string][];
}
declare module '../ext4' { interface Ext4 { x31: X31St } }
const fresh = (): X31St => ({ pop: {}, fic: {}, prem: {}, log: [] });
registerExt4('x31', fresh);
export function x31(s: GameState): X31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.x31 ??= fresh()) as X31St;
  st.pop ??= {}; st.fic ??= {}; st.prem ??= {}; st.log ??= [];
  return st;
}

// ================================================================ interruptores (controle central)

registerSwitch({ id: 'pop31.freq', def: 1, scope: 'game',
  desc: l('Referências da cultura pop e memes: no máximo quantas por mês (0 desliga, 1 poucas, 2 normal, 3 muitas).', 'Pop-culture references and memes: at most how many per month (0 off, 1 few, 2 normal, 3 many).') });
registerSwitch({ id: 'pop31.tone', def: 'normal', scope: 'game',
  desc: l('Tom das referências: "normal" ou "contido" (menos humor, sem memes).', 'Tone of references: "normal" or "restrained" (less humor, no memes).') });
registerSwitch({ id: 'pop31.serio', def: false, scope: 'game',
  desc: l('Humor em situações sérias: deixa piadas e memes aparecerem perto de morte ou tragédia.', 'Humor in serious situations: lets jokes and memes appear near death or tragedy.') });
registerSwitch({ id: 'fic31', def: true, scope: 'game',
  desc: l('Bandas de filmes, séries e animações entram no mundo como artistas (no ano em que a história se passa).', 'Bands from films, series and cartoons enter the world as artists (in the year the story is set).') });
registerSwitch({ id: 'extras31', def: true, scope: 'game',
  desc: l('Extras com efeito pequeno e opcional: Arara Trips (logística de turnê), trilha do filme de 2027, token do disco na bolha de 2021.', 'Extras with small optional effects: Arara Trips (tour logistics), the 2027 film soundtrack, the record token in the 2021 bubble.') });

export const popFreq31 = (s: GameState): number => clamp(Math.round(sw<number>(s, 'pop31.freq')), 0, 3);
export const popTone31 = (s: GameState): 'normal' | 'contido' => (sw<string>(s, 'pop31.tone') === 'contido' ? 'contido' : 'normal');

// ================================================================ conquistas novas

const yourHolders = new Set<string>([CO31, ME31, 'player']);
const ACH31: AchievementDef[] = [
  { id: 'run31', cat: 'company', icon: 'globe', name: l('Run completa', 'Full run'), desc: l('Comece em 1889 e chegue a 2040 na mesma partida.', 'Start in 1889 and reach 2040 in the same game.'),
    check: (s) => s.config.startYear <= 1889 && s.year >= 2040 },
  { id: 'myth31', cat: 'company', icon: 'star', name: l('Relíquia mítica', 'Mythic relic'), desc: l('Tenha (você ou a empresa) uma relíquia de nível Mítico.', 'Own (you or the company) a Mythic-level relic.'),
    check: (s) => relics(s).list.some((rl) => yourHolders.has(relicHolder31(rl)) && relicTierOf31(s, rl) >= 4) },
  { id: 'gift31', cat: 'company', icon: 'sparkle', name: l('O presente que virou relíquia', 'The gift that became a relic'), desc: l('Uma peça que passou por você como presente vira relíquia Rara ou mais.', 'A piece that passed through you as a gift becomes a Rare relic or better.'),
    check: (s) => relics(s).list.some((rl) => rl.own.some((o) => o[2] === 'presente') && rl.own.some((o) => yourHolders.has(o[0])) && relicTierOf31(s, rl) >= 2) },
  { id: 'home31', cat: 'company', icon: 'house', name: l('Casa em três épocas', 'A home across three eras'), desc: l('Fique com a mesma casa por três décadas seguidas.', 'Keep the same home for three decades in a row.'),
    check: (s) => owned(s).some((o) => goodById[o.id]?.cat === 'home' && Math.floor(yearOfWeek(s, o.week) / 10) <= Math.floor(s.year / 10) - 2) },
  { id: 'famiglia31', cat: 'company', icon: 'heart', name: l('Famiglia', 'Famiglia'), desc: l('Conheça Efro, Lucia, Sonia e Antonella Fossati.', 'Meet Efro, Lucia, Sonia and Antonella Fossati.'),
    check: (s) => famMet31(s).famiglia },
];
for (const d of ACH31) if (!achById[d.id]) { ACHIEVEMENTS.push(d); achById[d.id] = d; }

// ================================================================ ovos do Edison

const EDISON31 = ['edison_lamb', 'edison_tone31', 'edison_cyl31', 'edison_mary31'];
RULES27.push({ id: 'edison_tone31', phase: 'show', p: 0.2,
  test: (s, sh) => (sh && s.year >= 1915 && s.year <= 1925 && s.acts[sh.actId] && (s.acts[sh.actId].owner === 'player' || s.acts[sh.actId].playerBand) ? { act: s.acts[sh.actId] } : null),
  run: (s, c) => {
    const a = c.act!;
    a.fame = clamp(a.fame + 1, 0, 100);
    eggFire27(s, 'edison_tone31', { act: a.id, sev: 20, text: fmtL(l('Teste de tom: as luzes se apagam no meio do show de {a}. Ninguém na plateia sabe dizer se ouve a banda ou um disco de Edison. Quando acendem, aplausos — e a cidade comenta.', 'Tone test: the lights go out in the middle of {a}\'s show. Nobody in the audience can tell the band from an Edison record. When they come back on, applause — and the town talks.'), { a: a.name }) });
  } });
RULES27.push({ id: 'edison_cyl31', phase: 'month', p: 0.03,
  test: (s) => (s.year < 1931 ? {} : null),
  run: (s) => {
    const v = money(s, 40);
    post(s, 'x31:cyl', v, 'retail', 'Cilindros de cera vendidos');
    eggFire27(s, 'edison_cyl31', { sev: 10, tone: 'info', text: l('Um senhor de chapéu e bigode branco entra na loja, compra todos os cilindros de cera da prateleira e sai sem dizer o nome. O balconista jura que já viu aquele rosto num anúncio de fonógrafo.', 'A gentleman with a hat and a white moustache walks into the shop, buys every wax cylinder on the shelf and leaves without giving his name. The clerk swears he has seen that face on a phonograph ad.') });
  } });
/** O fonógrafo da Sede toca o "Mary" original (clique na Sede, uma vez por partida). */
export function edisonMary31(s: GameState): L | null {
  if (!markEgg27(s, 'edison_mary31', l('O fonógrafo da Sede toca a gravação original de "Mary had a little lamb".', 'The HQ phonograph plays the original "Mary had a little lamb" recording.'))) return null;
  return l('Chiado, um estalo e uma voz de 1877: "Mary had a little lamb…". As primeiras palavras gravadas da história, na sua Sede.', 'Hiss, a click and a voice from 1877: "Mary had a little lamb…". The first recorded words in history, in your HQ.');
}
onFact('easter_egg', (s, f) => {
  const id = String(f.data?.egg ?? '');
  if (EDISON31.includes(id) && EDISON31.every((e) => eg27(s).seen[e] !== undefined)) eggFeat27(s, 'edison31');
}, 'extras31:edison');

// ================================================================ bandas de filmes, séries e animações


/** Nome com que a banda nasce (o mundo nasce com nomes reais ou de homenagem, como os artistas reais). */
export const ficName31 = (s: GameState, f: Fiction31): string => (s.config.realNames ? f.n : REALNAMES31[`cur:fic_${f.id}`]?.substituto ?? homage31(f.n));
const ficMonth = (id: string): number => { let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 12; };
/** Bandas de ficção que entram por conta própria (não as que já estão na base de artistas reais). */
let FIC_ACT31: Fiction31[] | null = null;
export const ficActive31 = (): Fiction31[] => {
  if (FIC_ACT31) return FIC_ACT31;
  const real = new Set(REAL_ALL.map((a) => dedupKey27(a.n))); // preguiçoso: a base real carrega depois deste módulo
  return (FIC_ACT31 = FICTION31.filter((f) => !f.naBase && !real.has(dedupKey27(f.n))));
};

function spawnFic(s: GameState, f: Fiction31): Act | undefined {
  const city = cityById[f.c] ? f.c : s.config.homeCity;
  const genre = genreById[f.g] ? f.g : undefined;
  const r = Rng.fromSeed(`${s.config.seed}|fic31|${f.id}`);
  const a = spawnProceduralAct(s, r, { city, genre, members: Math.max(1, Math.min(6, f.m.length)), potential: f.kind === 'virou_real' ? 74 : 62, formedYear: s.year, fame: f.kind === 'virou_real' ? 18 : 8 });
  a.name = ficName31(s, f);
  a.members.forEach((pid, i) => { const p = s.persons[pid]; if (p && f.m[i]) p.name = s.config.realNames ? f.m[i] : homage31(f.m[i]); });
  x31(s).fic[f.id] = a.id;
  kin15(s).chk.push(a.id); // integrantes são personagens: sem sobrenome de "banda de irmãos" sorteado
  emitFact(s, { kind: 'culture31', actors: [a.id], place: city, severity: 15, visibility: 'public', tags: ['culture31', 'fiction'], src: 'extras31', data: { fic: f.id },
    text: f.fan ? fmtL(l('Surge em {c} uma banda que parece saída de uma obra de ficção: {a}. {fan}', 'A band that looks straight out of a work of fiction appears in {c}: {a}. {fan}'), { c: cityById[city].name, a: a.name, fan: f.fan })
      : fmtL(l('Surge em {c} uma banda que parece saída de uma obra de ficção: {a}.', 'A band that looks straight out of a work of fiction appears in {c}: {a}.'), { c: cityById[city].name, a: a.name }), diary: true });
  return a;
}

function ficMonthTick(s: GameState): void {
  if (!sw<boolean>(s, 'fic31')) return;
  const st = x31(s);
  for (const f of ficActive31()) {
    const id = st.fic[f.id];
    if (!id) {
      // entra no ano em que a história se passa (no mês da banda); começo de partida depois disso: até 12 anos depois
      if (s.year < f.ano || s.year > f.ano + 12) continue;
      if (s.year === f.ano && s.month !== ficMonth(f.id) && !(s.year === s.config.startYear)) continue;
      spawnFic(s, f);
      continue;
    }
    const a = s.acts[id];
    if (!a) continue;
    // estreia da obra: notícia e pico de fama (como uma trilha sonora)
    if (s.year === f.obraAno && st.prem[f.id] === undefined && s.month === ficMonth(`${f.id}|obra`)) {
      st.prem[f.id] = s.week;
      a.fame = clamp(a.fame + 6, 0, 100);
      a.momentum = clamp(a.momentum + 10, 0, 100);
      emitFact(s, { kind: 'culture31', actors: [a.id], severity: 25, visibility: 'public', tags: ['culture31', 'fiction', 'premiere'], src: 'extras31', data: { fic: f.id },
        text: fmtL(l('Estreia "{o}": {a} vira assunto em todo lugar e ganha um pico de fama, como uma trilha sonora.', '"{o}" premieres: {a} is the talk of the town and gets a fame spike, like a soundtrack.'), { o: f.obra, a: a.name }), diary: true });
    }
    // contratar uma banda de ficção (conquista secreta); a do amplificador que vai até 11 ganha o amplificador
    if (a.owner === 'player' && playerActs(s).includes(a.id)) {
      eggFeat27(s, 'fic31');
      if (f.id === 'spinal_tap' && eg27(s).amp[a.id] === undefined) eg27(s).amp[a.id] = s.week;
    }
  }
}

// ================================================================ cultura pop, memes, bolhas e fracassos

onFact('death', (s, f) => { if (f.actors.some((id) => s.acts[id]?.owner === 'player' || playerActs(s).some((a) => s.acts[a]?.members.includes(id)))) x31(s).grief = s.week; }, 'extras31:grief');

/** Referências que podem sair agora (lugar, época, tom e luto). Só leitura. */
export function popEligible31(s: GameState): Pop31[] {
  const st = x31(s);
  const tone = popTone31(s), serio = sw<boolean>(s, 'pop31.serio');
  const mourning = st.grief !== undefined && s.week - st.grief < 8;
  return POP31.filter((p) => st.pop[p.id] === undefined && s.year >= p.y0 && s.year <= p.y1
    && (!p.city || !cityById[p.city] || presence27(s, p.city))
    && (serio || (!p.serio && !(mourning && p.kind === 'meme')))
    && !(tone === 'contido' && p.kind === 'meme'));
}
export const popText31 = (s: GameState, p: Pop31): L => fmtL(p.text, { city: cityById[s.config.homeCity]?.name ?? l('sua cidade', 'your city') });

function popMonthTick(s: GameState): void {
  const n = popFreq31(s);
  if (!n) return;
  const r = Rng.fromSeed(`${s.config.seed}|pop31|${s.week}`);
  const pChance = popTone31(s) === 'contido' ? 0.18 : 0.3;
  let left = n;
  const pool = popEligible31(s);
  while (left > 0 && pool.length && r.chance(pChance)) {
    const p = pool.splice(r.int(0, pool.length - 1), 1)[0];
    firePop31(s, p);
    left--;
  }
}
/** Publica uma referência (também usado pelo editor e pelos testes). */
export function firePop31(s: GameState, p: Pop31): void {
  const st = x31(s);
  st.pop[p.id] = s.week;
  emitFact(s, { kind: 'culture31', actors: ['player'], place: p.city && cityById[p.city] ? p.city : s.config.homeCity, severity: p.kind === 'bolha' || p.kind === 'escandalo' ? 25 : 12,
    visibility: 'public', tags: ['culture31', p.kind], src: 'extras31', data: { pop: p.id }, text: popText31(s, p), diary: true });
}
// consumidor do fato: diário das referências (aba Extras)
onFact('culture31', (s, f) => {
  const id = String(f.data?.pop ?? f.data?.fic ?? '');
  if (!id) return;
  const st = x31(s);
  st.log.unshift([s.year, s.month, id]);
  if (st.log.length > 40) st.log.length = 40;
}, 'extras31:log');

// ================================================================ Arara Trips, o filme, a bolha do token

/** Arara Trips: como a agência faz a logística da turnê em cada época. */
export function araraEra31(year: number): L {
  if (year < 1920) return l('Passagens de navio a vapor e trem, baús com etiqueta e telegrama para cada hotel.', 'Steamship and train tickets, labelled trunks and a telegram to every hotel.');
  if (year < 1950) return l('Trem noturno, ônibus fretado e reservas por telefone de mesa.', 'Night trains, chartered buses and bookings over a desk telephone.');
  if (year < 1975) return l('Voos de hélice e a jato, vans e o roteiro datilografado em três vias.', 'Prop and jet flights, vans and the itinerary typed in triplicate.');
  if (year < 2000) return l('Agente com fax, passagens de papel e o ônibus de turnê com beliches.', 'An agent with a fax, paper tickets and a tour bus with bunks.');
  if (year < 2015) return l('Reservas pela internet, e-ticket e o celular do agente sempre ligado.', 'Online bookings, e-tickets and the agent\'s phone always on.');
  return l('Tudo pelo aplicativo: rota, hotel, van e passagem num toque.', 'All in the app: route, hotel, van and ticket in one tap.');
}
export const ARARA_FROM31 = 1889;
export const ARARA_W31 = 26;
export const araraOn31 = (s: GameState): boolean => sw<boolean>(s, 'extras31') && (x31(s).arara ?? 0) > s.week;
export interface XRes31 { ok: boolean; text: L }
/** Contrata a Arara Trips por seis meses: turnês dos seus artistas com menos risco de cancelamento. */
export function hireArara31(s: GameState): XRes31 {
  if (!sw<boolean>(s, 'extras31')) return { ok: false, text: l('Extras desligados (Opções › Interruptores).', 'Extras are off (Options › Switches).') };
  const st = x31(s);
  if ((st.arara ?? 0) > s.week) return { ok: false, text: fmtL(l('A Arara Trips já cuida das suas turnês por mais {w} semanas.', 'Arara Trips already handles your tours for {w} more weeks.'), { w: st.arara! - s.week }) };
  const cost = money(s, 1200);
  if (s.player.cash < cost) return { ok: false, text: l('Falta caixa para o contrato com a Arara Trips.', 'Not enough cash for the Arara Trips contract.') };
  post(s, 'x31:arara', -cost, 'live_costs', 'Arara Trips (logística de turnê)');
  st.arara = s.week + ARARA_W31;
  return { ok: true, text: l('Arara Trips contratada por seis meses: rotas, hotéis e transporte por conta deles (menos risco de cancelar shows).', 'Arara Trips hired for six months: routes, hotels and transport on them (less risk of cancelled shows).') };
}
registerMod('tourRisk', 'extras31:arara', (s, v, ctx) => (ctx.act && araraOn31(s) && (ctx.act.owner === 'player' || ctx.act.playerBand) ? { value: v * 0.85, label: l('Arara Trips', 'Arara Trips') } : null));

export const FILM_YEAR31 = 2027;
export const FILM31 = "L'educazione della nonna";
/** A trilha do filme: um artista seu grava a canção-tema (uma vez). */
export function filmSoundtrack31(s: GameState, actId: string): XRes31 {
  if (!sw<boolean>(s, 'extras31')) return { ok: false, text: l('Extras desligados (Opções › Interruptores).', 'Extras are off (Options › Switches).') };
  const st = x31(s);
  if (s.year !== FILM_YEAR31 || st.film?.open === undefined) return { ok: false, text: l('A oportunidade da trilha só existe no ano da estreia (2027).', 'The soundtrack opportunity only exists in the premiere year (2027).') };
  if (st.film.act) return { ok: false, text: l('A trilha já foi gravada.', 'The soundtrack has already been recorded.') };
  const a = s.acts[actId];
  if (!a || !playerActs(s).includes(actId)) return { ok: false, text: l('Escolha um artista seu.', 'Pick one of your artists.') };
  st.film.act = actId;
  a.fame = clamp(a.fame + 3, 0, 100);
  a.momentum = clamp(a.momentum + 6, 0, 100);
  post(s, 'x31:film', money(s, 3000), 'licensing', `Trilha de ${FILM31}`);
  emitFact(s, { kind: 'culture31', actors: [a.id], place: 'sao_paulo', severity: 25, visibility: 'public', tags: ['culture31', 'film'], src: 'extras31', data: { film: FILM31 },
    text: fmtL(l('{a} grava a canção-tema de "{f}", a coprodução Brasil–Itália.', '{a} records the theme song for "{f}", the Brazil–Italy co-production.'), { a: a.name, f: FILM31 }), diary: true });
  return { ok: true, text: fmtL(l('{a} grava a trilha: fama +3, impulso +6 e o cachê de licenciamento.', '{a} records the soundtrack: fame +3, momentum +6 and the licensing fee.'), { a: a.name }) };
}
function filmTick(s: GameState): void {
  const st = x31(s);
  if (s.year === FILM_YEAR31 && s.month === 2 && st.film === undefined) {
    st.film = { open: s.week };
    emitFact(s, { kind: 'culture31', actors: ['player'], place: 'sao_paulo', severity: 30, visibility: 'public', tags: ['culture31', 'film'], src: 'extras31', data: { film: FILM31 },
      text: l(`Estreia nos cinemas de São Paulo e de Milão "${FILM31}", coprodução Brasil–Itália. A produção procura uma canção-tema: a vaga está aberta para um artista seu.`, `"${FILM31}", a Brazil–Italy co-production, premieres in cinemas in São Paulo and Milan. The producers are looking for a theme song: the slot is open for one of your artists.`), diary: true, notify: 'info' });
  }
}

/** Bolha do token (2021–22): vender o "token" de um disco seu no auge — dinheiro rápido, fãs irritados. */
export function sellToken31(s: GameState, actId: string): XRes31 {
  if (!sw<boolean>(s, 'extras31')) return { ok: false, text: l('Extras desligados (Opções › Interruptores).', 'Extras are off (Options › Switches).') };
  if (s.year < 2021 || s.year > 2022) return { ok: false, text: l('A febre dos tokens só existe em 2021–22.', 'The token craze only exists in 2021–22.') };
  const st = x31(s);
  if (st.nft !== undefined) return { ok: false, text: l('Você já vendeu um token nesta bolha.', 'You already sold a token in this bubble.') };
  const a = s.acts[actId];
  if (!a || !playerActs(s).includes(actId)) return { ok: false, text: l('Escolha um artista seu.', 'Pick one of your artists.') };
  // no auge (2021) paga bem; em 2022 já vale quase nada
  const v = money(s, s.year === 2021 ? 400 + a.fame * 60 : 60 + a.fame * 4);
  st.nft = s.week;
  post(s, 'x31:nft', v, 'licensing', 'Token digital de um disco');
  a.fans.core = Math.max(0, Math.round(a.fans.core * 0.96));
  emitFact(s, { kind: 'culture31', actors: [a.id], severity: 20, visibility: 'public', tags: ['culture31', 'bolha'], src: 'extras31', data: { pop: 'nft' },
    text: fmtL(l('{a} vende o "token" de um disco. Parte dos fãs reclama.', '{a} sells a record "token". Some fans complain.'), { a: a.name }), diary: true });
  return { ok: true, text: fmtL(l('Token vendido: entrou caixa; os fãs mais fiéis de {a} torceram o nariz (−4%).', 'Token sold: cash came in; {a}\'s most loyal fans frowned (−4%).'), { a: a.name }) };
}

// ================================================================ Fossati: a praça e a placa

export const PLAQUE31: L = l('Praça Efro e Lucia Fossati. "Para Efro, Lucia, Antonella e Sonia" — homenagem de quem fez este jogo, com carinho. Ficção declarada: a família existe no jogo como pessoas, em todas as partidas.',
  'Efro and Lucia Fossati Square. "For Efro, Lucia, Antonella and Sonia" — a tribute from the people who made this game, with love. Declared fiction: the family exists in the game as people, in every run.');
export const DEDICATION31: L = l('Para Efro, Lucia, Antonella e Sonia.', 'For Efro, Lucia, Antonella and Sonia.');

// ================================================================ virada do mês

registerSimHook('month', 'extras31', (s) => {
  ficMonthTick(s);
  popMonthTick(s);
  filmTick(s);
});
