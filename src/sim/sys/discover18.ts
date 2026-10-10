// Rodada 18 (talent18, item 8) — canais de DESCOBERTA por época: noites de microfone aberto, rádio universitária,
// fitas demo pelo correio (caixa com ouvir / pedir mais / passar), MySpace, YouTube, SoundCloud, TikTok, indicação
// do seu elenco/produtores, palcos pequenos de festival, escolas de música (K3) e ir a um show para ver quem abre.
// Cada canal tem custo (dinheiro e bolinhas), QUALIDADE da informação (grau do scouting + ruído do relatório,
// menor com A&R) e VISIBILIDADE (canais públicos atraem rivais → disputa com prazo). Quem você recusou e virou
// estrela volta como "o que escapou" (Decca × Beatles).
// API: CH18, chNow18, dig18, watchShow18, addLead18, disc18, demoMedium18.

import { clamp, Rng } from '../../core/rng';
import { CITIES, GENRES, cityById, familyOf, l, type FamilyId, type L } from '../../data/world';
import { signWithRival } from '../contracts';
import { registerExt4, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { estimate } from '../scouting';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs, post, staffSkill } from '../util';
import { addSignal, spawnProceduralAct } from '../worldgen';
import { spendEnergy } from './life';

export interface Lead18 { a: string; ch: string; w: number; note: L; ref?: string }
export interface Disc18State { leads: Lead18[]; hot: Record<string, { lb: string; w: number }>; passed: Record<string, number>; gone: Record<string, 1>; asked: Record<string, number>; last: Record<string, number> }
declare module '../ext4' { interface Ext4 { disc18: Disc18State } }
const fresh = (): Disc18State => ({ leads: [], hot: {}, passed: {}, gone: {}, asked: {}, last: {} });
registerExt4('disc18', fresh);
export function disc18(s: GameState): Disc18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.disc18 ??= fresh()) as Disc18State;
  for (const [k, v] of Object.entries(fresh())) (st as unknown as Record<string, unknown>)[k] ??= v;
  return st;
}

export interface Ch18 {
  id: string; name: L; desc: L; from: number; to: number;
  /** custo em dólar real, bolinhas (tempo pessoal) */
  usd: number; balls: number;
  /** grau de scouting alcançado e ruído do relatório (desvio) */
  deg: number; noise: number;
  /** chance de um rival notar cada achado (0..1) */
  vis: number;
  n: [number, number];
  local?: boolean; fams?: FamilyId[]; fameUp?: number; potUp?: number;
  /** o que você aprende (texto) */
  sees: L;
}
export const CH18: Ch18[] = [
  { id: 'openmic', name: l('Noite de microfone aberto', 'Open-mic night'), desc: l('Bares e clubes da sua cidade: quem sobe ao palco sem rede.', 'Bars and clubs in your city: who gets up on stage without a net.'), from: 1920, to: 9999, usd: 120, balls: 1, deg: 2, noise: 9, vis: 0.08, n: [1, 3], local: true, sees: l('palco e voz ao vivo, nada de estúdio', 'live stage and voice, nothing about the studio') },
  { id: 'college', name: l('Rádio universitária', 'College radio'), desc: l('As paradas do campus: alternativos antes de todo mundo.', 'Campus charts: alternative acts before everyone else.'), from: 1965, to: 9999, usd: 400, balls: 1, deg: 2, noise: 8, vis: 0.18, n: [1, 2], fams: ['rock', 'electronic', 'hiphop', 'country_folk'], sees: l('canções e base de fãs jovem', 'songs and a young fan base') },
  { id: 'festival', name: l('Palcos pequenos de festival', 'Festival small stages'), desc: l('Um fim de semana correndo entre tendas: vários atos de uma vez.', 'A weekend running between tents: several acts at once.'), from: 1967, to: 9999, usd: 1500, balls: 2, deg: 2, noise: 9, vis: 0.35, n: [3, 4], sees: l('como seguram um público que não é deles', 'how they hold a crowd that is not theirs') },
  { id: 'myspace', name: l('MySpace', 'MySpace'), desc: l('Perfis com 4 músicas e contagem de plays.', 'Profiles with 4 songs and a play count.'), from: 2003, to: 2010, usd: 40, balls: 1, deg: 1, noise: 15, vis: 0.45, n: [3, 5], sees: l('plays e amigos: popularidade, não talento', 'plays and friends: popularity, not talent') },
  { id: 'youtube', name: l('YouTube', 'YouTube'), desc: l('Covers no quarto e clipes caseiros.', 'Bedroom covers and home-made videos.'), from: 2006, to: 9999, usd: 40, balls: 1, deg: 2, noise: 13, vis: 0.55, n: [2, 4], fameUp: 3, sees: l('voz e carisma na câmera; views são públicas', 'voice and on-camera charisma; views are public') },
  { id: 'soundcloud', name: l('SoundCloud', 'SoundCloud'), desc: l('Produtores de quarto, rap e eletrônica crua.', 'Bedroom producers, rap and raw electronic music.'), from: 2009, to: 9999, usd: 40, balls: 1, deg: 1, noise: 14, vis: 0.4, n: [3, 5], fams: ['hiphop', 'electronic', 'pop'], sees: l('produção e originalidade, pouco palco', 'production and originality, little stage') },
  { id: 'tiktok', name: l('TikTok', 'TikTok'), desc: l('15 segundos virais: o refrão chega antes do artista.', '15 viral seconds: the hook arrives before the artist.'), from: 2018, to: 9999, usd: 60, balls: 1, deg: 1, noise: 18, vis: 0.8, n: [3, 5], fameUp: 6, sees: l('um gancho e um número de views — o resto é aposta', 'one hook and a view count — the rest is a gamble') },
  { id: 'referral', name: l('Indicação do elenco', 'Roster referral'), desc: l('Seus artistas e produtores indicam quem tocou com eles.', 'Your artists and producers point to people who played with them.'), from: 1920, to: 9999, usd: 0, balls: 1, deg: 3, noise: 5, vis: 0.04, n: [1, 1], sees: l('opinião de quem dividiu palco e estrada', 'the view of someone who shared stage and road') },
  { id: 'school', name: l('Recital de escola de música', 'Music school recital'), desc: l('Formandos de conservatório, escola de jazz ou programa social.', 'Graduates of a conservatory, jazz school or social program.'), from: 1920, to: 9999, usd: 600, balls: 1, deg: 3, noise: 6, vis: 0.15, n: [2, 2], potUp: 4, sees: l('técnica e leitura afiadas; palco verde', 'sharp technique and reading; green on stage') },
];
export const chNow18 = (s: GameState): Ch18[] => CH18.filter((c) => s.year >= c.from && s.year <= c.to);
const ch = (id: string) => CH18.find((c) => c.id === id);
export const chCost18 = (s: GameState, c: Ch18) => money(s, c.usd);
const ready = (s: GameState, c: Ch18) => (disc18(s).last[c.id] ?? -99) <= s.week - 4;
/** Ruído efetivo (A&R reduz até 1/3). */
export const chNoise18 = (s: GameState, c: Ch18) => c.noise * (1 - staffSkill(s, 'anr') / 300);

/** Meio da demo por época. */
export function demoMedium18(s: GameState): L {
  const y = s.year;
  if (y >= 2018) return l('um link de TikTok numa DM', 'a TikTok link in a DM');
  if (y >= 2009) return l('um link de SoundCloud', 'a SoundCloud link');
  if (y >= 2003) return l('um perfil de MySpace', 'a MySpace profile');
  if (y >= 1995) return l('um CD-R pelo correio', 'a CD-R in the mail');
  if (y >= 1966) return l('uma fita cassete pelo correio', 'a cassette tape in the mail');
  if (y >= 1950) return l('um acetato gravado num estúdio de aluguel', 'an acetate cut at a pay-to-record studio');
  return l('uma carta pedindo uma audição', 'a letter asking for an audition');
}

const genreOf = (s: GameState, r: Rng, fams?: FamilyId[]): string | undefined => {
  if (!fams) return undefined;
  const gs = GENRES.filter((g) => fams.includes(familyOf(g.id)) && g.born <= s.year);
  return gs.length ? r.pick(gs).id : undefined;
};
const free = (a: Act) => !a.owner && a.status === 'emerging' && !a.deceased;

/** Registra um achado (qualquer canal, inclusive TV e escolas) com o grau/ruído do canal. */
export function addLead18(s: GameState, r: Rng, a: Act, chId: string, deg: number, noise: number, note: L, ref?: string): void {
  addSignal(s, r, a.id, `d18:${chId}`);
  const k = s.knowledge[a.id];
  if (k && k.degree < deg) { k.degree = deg; k.bias = r.normal(0, noise); }
  if (k) k.updatedWeek = s.week;
  const st = disc18(s);
  st.leads = st.leads.filter((x) => x.a !== a.id);
  st.leads.push({ a: a.id, ch: chId, w: s.week, note, ref });
  if (st.leads.length > 40) st.leads.splice(0, st.leads.length - 40);
}

function rivalNotice(s: GameState, r: Rng, a: Act, vis: number): string | undefined {
  if (!r.chance(vis * clamp(a.potential / 65, 0.4, 1.4))) return undefined;
  const lbs = Object.values(s.labels).filter((lb) => lb.active && lb.cash > money(s, 20000));
  if (!lbs.length) return undefined;
  const lb = r.weighted(lbs, (x) => 0.3 + x.aggression)!;
  const st = disc18(s);
  st.hot[a.id] = { lb: lb.id, w: s.week + r.int(4, 10) };
  pushInbox18(s, 'disc18_hot', { from: lb.name, subject: fmtL(l('{l} também está de olho em {a}', '{l} is also circling {a}'), { l: lb.name, a: a.name }),
    body: fmtL(l('O achado foi público demais: {l} marcou reunião com {a}. Se você não fizer proposta em poucas semanas, eles assinam.', 'The find was too public: {l} booked a meeting with {a}. If you do not make an offer within a few weeks, they sign.'), { l: lb.name, a: a.name }),
    ref: { act: a.id }, tone: 'bad', actions: [{ id: 'go', label: l('Fazer proposta', 'Make an offer') }, { id: 'no', label: l('Deixar ir', 'Let it go') }], weeks: 6 });
  return lb.name;
}

export interface Dig18 { ok: boolean; text: L; found: string[] }
/** Ir atrás de talento por um canal. */
export function dig18(s: GameState, chId: string): Dig18 {
  const c = ch(chId);
  if (!c || s.year < c.from || s.year > c.to) return { ok: false, text: l('Canal indisponível nesta época.', 'Channel not available in this era.'), found: [] };
  if (!ready(s, c)) return { ok: false, text: l('Você já usou este canal neste mês.', 'You already used this channel this month.'), found: [] };
  const cost = chCost18(s, c);
  if (s.player.cash < cost) return { ok: false, text: l('Caixa insuficiente.', 'Not enough cash.'), found: [] };
  if (c.id === 'referral' && !playerActs(s).length) return { ok: false, text: l('Você ainda não tem elenco para indicar ninguém.', 'You have no roster yet to refer anyone.'), found: [] };
  if (c.balls) { const e = spendEnergy(s, c.balls); if (e) return { ok: false, text: e, found: [] }; }
  const st = disc18(s);
  st.last[c.id] = s.week;
  if (cost) post(s, `d18:${c.id}`, -cost, 'scouting', `Descoberta: ${c.name.pt}`);
  const r = Rng.fromSeed(`${s.config.seed}|dig18|${c.id}|${s.week}`);
  const n = r.int(c.n[0], c.n[1]) + (s.scouts.length && c.n[1] > 1 ? 1 : 0);
  let ref: { pid: string; act: Act } | undefined;
  if (c.id === 'referral') { const act = s.acts[r.pick(playerActs(s))]; const pid = act && r.pick(act.members); if (act && pid) ref = { pid, act }; }
  const city = c.local ? s.config.homeCity : ref?.act.city;
  const fams = ref ? [familyOf(ref.act.genre)] : c.fams;
  let pool = Object.values(s.acts).filter((a) => free(a) && (!city || a.city === city) && (!fams || fams.includes(familyOf(a.genre))) && !st.leads.some((x) => x.a === a.id));
  pool = r.shuffle(pool).slice(0, Math.ceil(n / 2));
  while (pool.length < n) {
    const a = spawnProceduralAct(s, r, { city: city ?? r.pick(CITIES.filter((x) => s.player.territories.includes(x.market)).concat(CITIES.slice(0, 1))).id, genre: genreOf(s, r, fams) });
    if (c.potUp) a.potential = clamp(a.potential + c.potUp, 0, 99);
    pool.push(a);
  }
  const noise = chNoise18(s, c);
  const found: string[] = [];
  const rivals: string[] = [];
  for (const a of pool) {
    if (c.fameUp) a.fame = clamp(a.fame + c.fameUp * r.float(0.3, 1.2), 0, 100);
    const note = ref ? fmtL(l('{p} ({b}) indica: "tocamos juntos em {c}".', '{p} ({b}) recommends: "we played together in {c}".'), { p: s.persons[ref.pid]?.name ?? '?', b: ref.act.name, c: cityById[a.city]?.name ?? a.city }) : fmtL(l('{c}: {w}.', '{c}: {w}.'), { c: c.name, w: c.sees });
    addLead18(s, r, a, c.id, c.deg, noise, note, ref?.pid);
    found.push(a.id);
    const lb = rivalNotice(s, r, a, c.vis);
    if (lb) rivals.push(`${a.name} (${lb})`);
  }
  const text = fmtL(l('{c}: {n} nome(s) — {names}. Informação: grau {d}, margem ±{e}.{r}', '{c}: {n} name(s) — {names}. Info: degree {d}, margin ±{e}.{r}'),
    { c: c.name, n: found.length, names: found.map((id) => s.acts[id].name).join(', '), d: c.deg, e: Math.round(noise), r: rivals.length ? fmtL(l(' Rivais notaram: {x}.', ' Rivals noticed: {x}.'), { x: rivals.join(', ') }) : '' });
  return { ok: true, text, found };
}

/** Shows que dá para ver nesta semana (cabeças de cartaz famosos no seu mercado). */
export function showsNow18(s: GameState): Act[] {
  const home = cityById[s.config.homeCity]?.market;
  return Object.values(s.acts).filter((a) => a.status === 'active' && a.fame >= 35 && !a.deceased && cityById[a.city]?.market === home).sort((a, b) => b.fame - a.fame).slice(0, 6);
}
/** Ir ao show de alguém e prestar atenção em quem abre a noite. */
export function watchShow18(s: GameState, headId: string): Dig18 {
  const h = s.acts[headId];
  if (!h) return { ok: false, text: l('Show indisponível.', 'Show unavailable.'), found: [] };
  const st = disc18(s);
  if ((st.last[`show:${headId}`] ?? -99) > s.week - 8) return { ok: false, text: l('Você já viu este show há pouco.', 'You saw this show recently.'), found: [] };
  const cost = money(s, 60 + h.fame * 4);
  if (s.player.cash < cost) return { ok: false, text: l('Caixa insuficiente.', 'Not enough cash.'), found: [] };
  const e = spendEnergy(s, 1); if (e) return { ok: false, text: e, found: [] };
  st.last[`show:${headId}`] = s.week;
  post(s, `d18show:${headId}`, -cost, 'scouting', `Show de ${h.name}`);
  const r = Rng.fromSeed(`${s.config.seed}|show18|${headId}|${s.week}`);
  const fam = familyOf(h.genre);
  const pool = Object.values(s.acts).filter((a) => free(a) && familyOf(a.genre) === fam && cityById[a.city]?.market === cityById[h.city]?.market);
  const op = pool.length && r.chance(0.6) ? r.pick(pool) : spawnProceduralAct(s, r, { city: h.city, genre: h.genre });
  const crowd = r.int(0, 100);
  const tal = op.potential;
  const vibe = tal + crowd / 3 > 75 ? l('o público parou de pedir cerveja', 'the crowd stopped ordering beer') : tal > 55 ? l('alguns ficaram até o fim', 'a few stayed to the end') : l('o salão ainda estava enchendo', 'the hall was still filling up');
  addLead18(s, r, op, 'opener', 3, chNoise18(s, { noise: 7 } as Ch18), fmtL(l('Abriu para {h}: {v}.', 'Opened for {h}: {v}.'), { h: h.name, v: vibe }));
  const lb = rivalNotice(s, r, op, 0.22);
  emitFact(s, { kind: 'show', actors: [op.id, h.id], place: h.city, severity: 8, visibility: 'rumor', tags: ['scout', 'opener'], src: 'discover18', text: fmtL(l('{c} foi visto no show de {h}, prestando atenção na banda de abertura ({o}).', '{c} was spotted at {h}\'s show, watching the opener ({o}).'), { c: s.config.companyName, h: h.name, o: op.name }) });
  return { ok: true, found: [op.id], text: fmtL(l('Show de {h}. Quem abriu: {o} — {v}. Você viu de perto (grau 3).{r}', '{h}\'s show. The opener: {o} — {v}. You saw them up close (degree 3).{r}'), { h: h.name, o: op.name, v: vibe, r: lb ? fmtL(l(' {l} estava na plateia também.', ' {l} was in the crowd too.'), { l: lb }) : '' }) };
}

// ---------------------------------------------------------------- caixa: demos e disputa
registerInboxKind('disc18_demo', { label: l('Demo', 'Demo'), cat: 'decision', icon: 'disc', prio: 1, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, act) => {
    const id = String(m.ref?.act ?? ''), a = s.acts[id], st = disc18(s);
    if (!a) return l('O artista sumiu.', 'The artist is gone.');
    const r = Rng.fromSeed(`${s.config.seed}|demo18|${id}|${act}`);
    if (act === 'listen' || act === 'more') {
      addLead18(s, r, a, 'demo', 2, 10, fmtL(l('Demo: {m}.', 'Demo: {m}.'), { m: demoMedium18(s) }));
      const e = estimate(s, id, 'talent');
      if (act === 'more') { st.asked[id] = s.week + 3; return fmtL(l('Você pediu mais material a {a}. Resposta em ~3 semanas (talento estimado {lo}–{hi}).', 'You asked {a} for more material. Answer in ~3 weeks (estimated talent {lo}–{hi}).'), { a: a.name, lo: e?.lo ?? '?', hi: e?.hi ?? '?' }); }
      return fmtL(l('Você ouviu {a}: talento estimado {lo}–{hi}. Veja a ficha para fazer proposta.', 'You listened to {a}: estimated talent {lo}–{hi}. Open their page to make an offer.'), { a: a.name, lo: e?.lo ?? '?', hi: e?.hi ?? '?' });
    }
    st.passed[id] = s.week;
    return fmtL(l('Você passou {a}. (Torça para não virar um caso Decca × Beatles.)', 'You passed on {a}. (Hope it is not a Decca × Beatles story.)'), { a: a.name });
  } });
registerInboxKind('disc18_more', { label: l('Demo', 'Demo'), cat: 'decision', icon: 'disc', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, act) => {
    const id = String(m.ref?.act ?? ''), a = s.acts[id];
    if (!a) return l('O artista sumiu.', 'The artist is gone.');
    if (act === 'meet') { const e = spendEnergy(s, 1); if (e) return e; const k = s.knowledge[id]; if (k) k.degree = Math.max(k.degree, 4); return fmtL(l('Conversa com {a}: agora você conhece ambição e traços (grau 4).', 'A talk with {a}: now you know ambition and traits (degree 4).'), { a: a.name }); }
    disc18(s).passed[id] = s.week;
    return l('Você agradeceu e passou.', 'You said thanks and passed.');
  } });
registerInboxKind('disc18_hot', { label: l('Disputa', 'Bidding'), cat: 'deals', icon: 'handshake', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act), label: l('Abrir ficha e propor', 'Open page and offer') } : null),
  handle: (_s, m, act) => (act === 'go' ? l('Abra a ficha do artista e faça a proposta antes do prazo.', 'Open the artist page and make an offer before the deadline.') : l('Você deixou o rival ficar com ele.', 'You let the rival have them.')) });

registerSimHook('month', 'discover18', (s) => {
  const st = disc18(s);
  const r = Rng.fromSeed(`${s.config.seed}|disc18m|${s.week}`);
  // demos chegando pelo meio da época
  if (s.config.role !== 'artist' && r.chance(0.45 + Math.min(0.3, s.player.reputation.artists / 200))) {
    const pool = Object.values(s.acts).filter((a) => free(a) && !st.leads.some((x) => x.a === a.id) && !st.passed[a.id]);
    const a = pool.length && r.chance(0.7) ? r.pick(pool) : spawnProceduralAct(s, r, {});
    pushInbox18(s, 'disc18_demo', { from: a.name, subject: fmtL(l('Demo: {a} ({g})', 'Demo: {a} ({g})'), { a: a.name, g: a.genre.replace(/_/g, ' ') }),
      body: fmtL(l('Chegou {m} de {a}, de {c}. Ouvir custa só tempo; pedir mais material dá uma segunda impressão (grau 3) em 3 semanas.', '{m} arrived from {a}, from {c}. Listening costs only time; asking for more gives a second impression (degree 3) in 3 weeks.'), { m: demoMedium18(s), a: a.name, c: cityById[a.city]?.name ?? a.city }),
      ref: { act: a.id }, actions: [{ id: 'listen', label: l('Ouvir', 'Listen') }, { id: 'more', label: l('Pedir mais material', 'Ask for more') }, { id: 'pass', label: l('Passar', 'Pass') }], weeks: 6 });
  }
  // respostas a "pedir mais"
  for (const [id, w] of Object.entries(st.asked)) {
    if (w > s.week) continue;
    delete st.asked[id];
    const a = s.acts[id];
    if (!a) continue;
    if (a.owner && a.owner !== 'player') { notify(s, fmtL(l('{a} não esperou: assinou com {l}.', '{a} did not wait: signed with {l}.'), { a: a.name, l: s.labels[a.owner]?.name ?? '?' }), 'bad'); continue; }
    addLead18(s, r, a, 'demo', 3, 7, l('Segunda demo + vídeo ao vivo.', 'Second demo + live video.'));
    pushInbox18(s, 'disc18_more', { from: a.name, subject: fmtL(l('{a} mandou mais', '{a} sent more'), { a: a.name }), body: l('Três faixas novas e um vídeo de show. Agora dá para ver o potencial (grau 3). Marcar uma conversa revela ambição e traços.', 'Three new tracks and a live video. Now you can see the potential (degree 3). A meeting reveals ambition and traits.'),
      ref: { act: id }, actions: [{ id: 'meet', label: l('Marcar conversa (1 bolinha)', 'Set a meeting (1 ball)') }, { id: 'pass', label: l('Passar', 'Pass') }] });
  }
  // disputa: rival assina se você não agir
  for (const [id, h] of Object.entries(st.hot)) {
    const a = s.acts[id];
    if (!a || a.owner) { delete st.hot[id]; continue; }
    if (s.week < h.w) continue;
    delete st.hot[id];
    if (!s.labels[h.lb]?.active) continue;
    signWithRival(s, a, h.lb, r, true);
    if (a.owner === h.lb) emitFact(s, { kind: 'signing', actors: [a.id], severity: 15, visibility: 'public', tags: ['rival', 'scout'], src: 'discover18', text: fmtL(l('{l} chega primeiro e assina {a}.', '{l} gets there first and signs {a}.'), { l: s.labels[h.lb].name, a: a.name }) });
  }
});

// "o que escapou": quem você recusou e virou estrela em outro selo
registerSimHook('year', 'discover18', (s) => {
  const st = disc18(s);
  const cand = new Set([...Object.keys(st.passed), ...st.leads.filter((x) => s.week - x.w > 26).map((x) => x.a)]);
  for (const id of cand) {
    const a = s.acts[id];
    if (!a || st.gone[id] || a.owner === 'player' || a.fame < 45 || !a.owner) continue;
    st.gone[id] = 1;
    const passed = st.passed[id] !== undefined;
    const y = Math.floor((st.passed[id] ?? st.leads.find((x) => x.a === id)?.w ?? 0) / 52) + s.config.startYear;
    if (passed) s.player.reputation.artists = clamp(s.player.reputation.artists - 1, 0, 100);
    const t = passed ? fmtL(l('{a} conta em entrevista que {c} recusou a demo deles em {y}. Hoje lotam estádios por {l}.', '{a} tells an interviewer that {c} turned down their demo in {y}. Today they fill stadiums for {l}.'), { a: a.name, c: s.config.companyName, y, l: s.labels[a.owner]?.name ?? '?' })
      : fmtL(l('{a}, que você viu primeiro, estourou por {l}.', '{a}, whom you saw first, broke big with {l}.'), { a: a.name, l: s.labels[a.owner]?.name ?? '?' });
    emitFact(s, { kind: 'memory', actors: [a.id, 'player'], severity: passed ? 35 : 20, visibility: 'public', tags: ['scout', 'got_away'], src: 'discover18', text: t });
    notify(s, t, 'bad');
  }
});

registerExplain('disc18.ch', (s, c) => {
  const x = ch(String(c.ch));
  if (!x) return null;
  return { title: x.name, value: x.deg, fmt: 'num', parts: [
    { label: l('Grau de scouting alcançado', 'Scouting degree reached'), value: x.deg, fmt: 'num' },
    { label: l('Margem de erro do relatório', 'Report error margin'), value: Math.round(chNoise18(s, x)), fmt: 'num', note: l('A&R na equipe reduz.', 'A&R staff reduce it.') },
    { label: l('Chance de rival notar', 'Chance a rival notices'), value: x.vis, fmt: 'pct', tone: x.vis > 0.3 ? 'bad' : '' },
    { label: l('Custo', 'Cost'), value: chCost18(s, x), fmt: 'money' }], note: x.sees };
});

registerAdvisorTip('discover18', (s) => {
  const st = disc18(s);
  const hot = Object.entries(st.hot).filter(([id]) => s.acts[id] && !s.acts[id].owner);
  if (!hot.length) return [];
  const [id, h] = hot[0];
  return [{ id: `d18hot-${id}`, level: 'warn', cat: 'opportunity', score: 62, text: fmtL(l('{l} vai assinar {a} em {w} semanas.', '{l} will sign {a} in {w} weeks.'), { l: s.labels[h.lb]?.name ?? '?', a: s.acts[id].name, w: Math.max(0, h.w - s.week) }),
    why: [l('Achado em canal público.', 'Found on a public channel.')], goto: { act: id } }];
});
