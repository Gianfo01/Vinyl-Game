// Rodada 18 (media18, M1) — RÁDIO COMO MERCADO. Estações com FORMATO (rede nacional, Top 40, adulto contemporâneo,
// rock de álbum, urbana, country, universitária, latina, rítmica), DIRETOR DE PROGRAMAÇÃO com gosto e memória,
// CONSULTORES que decidem por dezenas de rádios de uma vez (Drake-Chenault nos anos 60–80 no Top 40; Burkhart/
// Abrams formatando centenas de rádios de rock de álbum nos 70–90; os outros são fictícios) e o ciclo de ADIÇÃO →
// rotação leve → média → pesada → saída. O jogador escolhe a faixa, o formato e COMO chegar:
//   • visita própria (barata, depende da relação com o diretor);
//   • divulgador contratado (legítimo, mais caro);
//   • promotor independente (o jabá terceirizado dos anos 80–2000): funciona melhor, mas cada pagamento fica
//     registrado — "quem pagou, quem filmou" — e pode vazar para a imprensa (world4 jabá, crime17 calor, escândalo).
// Versão editada para rádio: abre portas no Top 40/AC/urbana; artista que preza a arte reclama.
// No streaming a rádio pesa menos (ainda conta para o público adulto e para o carro).

import { Rng, clamp, seedState } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { familyOf, l, type FamilyId, type L } from '../../data/world';
import { registerExplain } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { scandal } from '../scandal17';
import type { GameState, Release } from '../types';
import { fmtL, hasTech, money, notify, playerActs, post, remember } from '../util';
import { addHeat } from './crime17';
import { w4 } from './world4/state';

export type Fmt18 = 'network' | 'top40' | 'adult' | 'aor' | 'urban' | 'country' | 'college' | 'latin' | 'dance';
export interface FmtDef18 { name: L; from: number; to?: number; fam: FamilyId[]; reach: number; strict: number; edit?: boolean; desc: L }
export const FMT18: Record<Fmt18, FmtDef18> = {
  network: { name: l('Rede nacional (ao vivo)', 'National network (live)'), from: 1925, to: 1956, fam: ['pop', 'blues_jazz', 'country_folk', 'sacred', 'europe'], reach: 1.6, strict: 0.7, desc: l('Orquestras e programas patrocinados: poucas vagas, muito alcance.', 'Orchestras and sponsored shows: few slots, huge reach.') },
  top40: { name: l('Top 40', 'Top 40'), from: 1955, fam: ['pop', 'rock', 'rnb', 'electronic', 'hiphop', 'latin'], reach: 1.4, strict: 0.55, edit: true, desc: l('Lista curta tocada sem parar; só entra o que já cheira a sucesso.', 'A short list on repeat; only what already smells like a hit gets in.') },
  adult: { name: l('Adulto contemporâneo', 'Adult contemporary'), from: 1965, fam: ['pop', 'blues_jazz', 'country_folk', 'europe', 'rnb'], reach: 1, strict: 0.7, edit: true, desc: l('Escritórios e consultórios: público fiel, mais velho, compra álbum.', 'Offices and waiting rooms: loyal, older audience that buys albums.') },
  aor: { name: l('Rock de álbum (AOR)', 'Album rock (AOR)'), from: 1968, to: 2006, fam: ['rock'], reach: 0.9, strict: 0.45, desc: l('Toca faixas de álbum, não só singles: ótimo para LP de rock.', 'Plays album tracks, not just singles: great for rock LPs.') },
  urban: { name: l('Urbana (R&B/hip-hop)', 'Urban (R&B/hip-hop)'), from: 1972, fam: ['rnb', 'hiphop', 'caribbean', 'africa'], reach: 1, strict: 0.5, edit: true, desc: l('Dita o que a juventude negra urbana ouve; DJs com nome próprio.', 'Sets what young urban audiences hear; DJs with their own names.') },
  country: { name: l('Country', 'Country'), from: 1950, fam: ['country_folk'], reach: 0.8, strict: 0.6, desc: l('Rede própria, gosto conservador, lealdade enorme.', 'Its own network, conservative taste, enormous loyalty.') },
  college: { name: l('Universitária/comunitária', 'College/community'), from: 1975, fam: ['rock', 'electronic', 'hiphop', 'country_folk', 'africa', 'caribbean'], reach: 0.35, strict: 0.15, desc: l('Alcance pequeno, aceita quase tudo novo; lança cenas.', 'Small reach, takes almost anything new; launches scenes.') },
  latin: { name: l('Latina', 'Latin'), from: 1970, fam: ['latin', 'caribbean', 'brazil'], reach: 0.8, strict: 0.5, desc: l('Rádios em espanhol e português; diáspora e mercado próprio.', 'Spanish- and Portuguese-language radio; diaspora and its own market.') },
  dance: { name: l('Rítmica/dance', 'Rhythmic/dance'), from: 1978, fam: ['electronic', 'pop', 'rnb', 'latin', 'hiphop'], reach: 0.8, strict: 0.45, edit: true, desc: l('O que toca nas pistas vai para o ar; remix ajuda.', 'What plays in clubs goes on air; remixes help.') },
};
export const fmtsNow18 = (s: GameState): Fmt18[] => (Object.keys(FMT18) as Fmt18[]).filter((k) => hasTech(s, 'radio') && s.year >= FMT18[k].from && (!FMT18[k].to || s.year <= FMT18[k].to!));

export interface ConsDef18 { id: string; name: string; fmt: Fmt18; from: number; to: number; strict: number; real?: boolean; desc: L }
export const CONS18: ConsDef18[] = [
  { id: 'drake', name: 'Drake-Chenault', fmt: 'top40', from: 1965, to: 1985, strict: 0.75, real: true, desc: l('O formato "Boss Radio": lista curta, pouca conversa, muitas rádios seguindo a mesma lista.', 'The "Boss Radio" format: short list, little talk, many stations on the same list.') },
  { id: 'ba', name: 'Burkhart/Abrams', fmt: 'aor', from: 1973, to: 1996, strict: 0.65, real: true, desc: l('Consultoria que formatou centenas de rádios de rock de álbum com pesquisa de público.', 'The consultancy that formatted hundreds of album-rock stations with audience research.') },
  { id: 'callout', name: 'CallOut Partners', fmt: 'top40', from: 1986, to: 2100, strict: 0.7, desc: l('Pesquisa por telefone ("call-out"): só adiciona o que o público já reconhece.', 'Phone research ("call-out"): only adds what the audience already recognizes.') },
  { id: 'urbanpulse', name: 'Urban Pulse', fmt: 'urban', from: 1982, to: 2100, strict: 0.55, desc: l('Consultoria das rádios urbanas: ouve as ruas e os clubes.', 'The urban stations\' consultancy: listens to streets and clubs.') },
  { id: 'softac', name: 'SoftAC Research', fmt: 'adult', from: 1984, to: 2100, strict: 0.75, desc: l('Testes com mães e escritórios; nada que assuste o anunciante.', 'Tests with moms and offices; nothing that scares advertisers.') },
  { id: 'ritmo', name: 'Ritmo Consultores', fmt: 'latin', from: 1985, to: 2100, strict: 0.5, desc: l('Programação para rádios latinas dos EUA e da América Latina.', 'Programming for Latin stations in the US and Latin America.') },
];
export const consNow18 = (s: GameState, f: Fmt18): ConsDef18 | undefined => CONS18.find((c) => c.fmt === f && s.year >= c.from && s.year <= c.to);

export interface Station18 { id: string; call: string; fmt: Fmt18; pd: string; adv: number; rel: number; cons?: string; reach: number; lunch?: number }
export interface Rot18 { st: string; lvl: number; w: number }
export interface Paid18 { w: number; rel: string; act: string; who: string; amt: number; out?: boolean }
export interface Radio18State { st: Station18[]; rot: Record<string, Rot18[]>; tried: Record<string, number>; paid: Paid18[]; n: { pitch: number; adds: number; heavy: number; exposed: number }; seq: number }
declare module '../ext4' { interface Ext4 { radio18: Radio18State } }
const fresh = (): Radio18State => ({ st: [], rot: {}, tried: {}, paid: [], n: { pitch: 0, adds: 0, heavy: 0, exposed: 0 }, seq: 0 });
registerExt4('radio18', fresh);
export function radio18(s: GameState): Radio18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.radio18 ??= fresh()) as Radio18State;
  const o = st as unknown as Record<string, unknown>;
  if (!o.ok18) { const f = fresh(); for (const k of Object.keys(f) as (keyof Radio18State)[]) o[k] ??= f[k]; o.ok18 = 1; }
  return st;
}

const FIRST = ['Bob', 'Jim', 'Carol', 'Dale', 'Marcy', 'Ray', 'Lou', 'Denise', 'Hal', 'Ruth', 'Sal', 'Tina', 'Vic', 'Gus', 'Nadia', 'Rita', 'Otis', 'Lena'];
const LAST = ['Harlan', 'Kowalski', 'Price', 'Mendez', 'Okafor', 'Duval', 'Stone', 'Brandt', 'Ferreira', 'Quinn', 'Lowe', 'Navarro', 'Bishop', 'Castro', 'Reyes', 'Vance'];
/** gera (uma vez por formato) três estações: duas com consultor quando há um, uma independente */
export function ensureStations18(s: GameState): Station18[] {
  const st = radio18(s);
  const usa = countryOfCity(s.config.homeCity) === 'USA';
  for (const f of fmtsNow18(s)) {
    if (st.st.some((x) => x.fmt === f)) continue;
    const r = new Rng(seedState(`radio18|${s.config.seed}|${f}`));
    for (let i = 0; i < 3; i++) {
      const freq = f === 'network' ? `${r.int(55, 160) * 10} AM` : `${r.int(88, 107)}.${r.int(1, 9)} FM`;
      const call = usa ? `${r.pick(['W', 'K'])}${String.fromCharCode(65 + r.int(0, 25))}${String.fromCharCode(65 + r.int(0, 25))}${String.fromCharCode(65 + r.int(0, 25))} ${freq}` : `${r.pick(['Rádio', 'Radio', 'Onda', 'Super', 'Nova'])} ${r.pick(['Cidade', 'Capital', 'Mix', 'Hits', 'Sul', 'Metrô', 'Litoral'])} ${freq}`;
      const cons = i < 2 && consNow18(s, f) ? consNow18(s, f)!.id : undefined;
      st.st.push({ id: `rs${++st.seq}`, call, fmt: f, pd: `${r.pick(FIRST)} ${r.pick(LAST)}`, adv: r.next(), rel: r.int(10, 35), cons, reach: Math.round((0.6 + r.next() * 0.8) * 100) / 100 });
    }
  }
  // consultores mudam com as décadas
  for (const x of st.st) { const c = consNow18(s, x.fmt); if (x.cons && (!c || c.id !== x.cons)) x.cons = c?.id; }
  st.st = st.st.filter((x) => fmtsNow18(s).includes(x.fmt));
  return st.st;
}

/** peso da rádio na época (no streaming conta menos) */
export const radioWeight18 = (s: GameState): number => (!hasTech(s, 'radio') ? 0 : hasTech(s, 'short_video') ? 0.35 : hasTech(s, 'streaming') ? 0.45 : hasTech(s, 'internet') ? 0.8 : 1);

export type How18 = 'self' | 'plug' | 'indie';
export const HOW18: Record<How18, { name: L; real: number; base: number; desc: L }> = {
  self: { name: l('Visita própria', 'Own visit'), real: 300, base: 0.12, desc: l('Você leva o disco ao diretor. Depende da relação.', 'You bring the record to the PD. Depends on the relationship.') },
  plug: { name: l('Divulgador contratado', 'Hired plugger'), real: 2500, base: 0.25, desc: l('Profissional legítimo com agenda nas rádios.', 'A legitimate pro with access to the stations.') },
  indie: { name: l('Promotor independente', 'Independent promoter'), real: 9000, base: 0.42, desc: l('O jabá terceirizado: funciona, mas o pagamento fica registrado e pode vazar.', 'Outsourced payola: it works, but the payment is on record and can leak.') },
};

/** chance de uma estação adicionar a faixa, com o porquê */
export function addOdds18(s: GameState, rel: Release, x: Station18, how: How18, edit: boolean): { p: number; why: L[] } {
  const act = s.acts[rel.actId], f = FMT18[x.fmt];
  const why: L[] = [];
  let p = HOW18[how].base;
  why.push(fmtL(l('{h}: {v}', '{h}: {v}'), { h: HOW18[how].name, v: pc(p) }));
  if (how === 'indie' && w4(s).payola && s.year >= 1980 && s.year < 2006) { p += 0.08; why.push(l('Era dos promotores independentes: +8%', 'Independent-promoter era: +8%')); }
  const fit = act && f.fam.includes(familyOf(act.genre)) ? 0.12 : -0.25;
  p += fit; why.push(fmtL(l('Gênero no formato: {v}', 'Genre fits the format: {v}'), { v: sg(fit) }));
  const qk = (rel.q - 55) / 120; p += qk; why.push(fmtL(l('Qualidade: {v}', 'Quality: {v}'), { v: sg(qk) }));
  if (x.fmt === 'aor' && rel.type === 'lp') { p += 0.08; why.push(l('Rock de álbum toca LP: +8%', 'Album rock plays LPs: +8%')); }
  if (act) { const fk = act.fame / 200 - f.strict * 0.15; p += fk; why.push(fmtL(l('Fama × exigência do formato: {v}', 'Fame × format strictness: {v}'), { v: sg(fk) })); }
  const rk = (x.rel - 25) / 250; p += rk; why.push(fmtL(l('Relação com {pd}: {v}', 'Relationship with {pd}: {v}'), { pd: x.pd, v: sg(rk) }));
  if (act && act.fame < 30 && x.adv > 0.6) { p += 0.1; why.push(l('Diretor aventureiro gosta de novidade: +10%', 'Adventurous PD likes new acts: +10%')); }
  if (edit && f.edit) { p += 0.1; why.push(l('Versão editada para rádio: +10%', 'Radio edit: +10%')); }
  const c = x.cons ? CONS18.find((k) => k.id === x.cons) : undefined;
  if (c) {
    const proof = rel.peak <= 40 ? 1 : rel.peak <= 100 ? 0.75 : 0.5;
    const k = 1 - c.strict * (1 - proof);
    p *= k; why.push(fmtL(l('Consultor {c} quer prova (paradas): ×{k}', 'Consultant {c} wants proof (charts): ×{k}'), { c: c.name, k: Math.round(k * 100) / 100 }));
  }
  return { p: clamp(p, 0.02, 0.9), why };
}
const pc = (x: number) => `${Math.round(x * 100)}%`;
const sg = (x: number) => `${x >= 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)}%`;

/** Leva uma faixa a um formato: cada estação decide (as de um mesmo consultor decidem juntas). */
export function pitchRadio18(s: GameState, relId: string, f: Fmt18, how: How18, edit = false): L {
  const rel = s.releases[relId];
  if (!rel || rel.owner !== 'player') return l('Lançamento inválido.', 'Invalid release.');
  if (!hasTech(s, 'radio')) return l('Ainda não há rádio.', 'There is no radio yet.');
  if (!fmtsNow18(s).includes(f)) return l('Esse formato não existe nesta época.', 'That format does not exist in this era.');
  if (s.week - rel.week > 16) return l('Faixa velha demais para a reunião de programação.', 'Too old for the programming meeting.');
  const st = radio18(s), key = `${relId}|${f}`;
  if (st.tried[key]) return l('Já apresentada a esse formato.', 'Already pitched to this format.');
  const cost = money(s, HOW18[how].real);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `r18p:${key}`, -cost, how === 'indie' ? 'w4_payola' : 'promo', how === 'indie' ? 'Consultoria de rádio (?)' : `Divulgação em rádio: ${rel.title}`);
  st.tried[key] = s.week;
  st.n.pitch++;
  const act = s.acts[rel.actId];
  if (edit && FMT18[f].edit && act && !act.playerBand && act.members.some((id) => s.persons[id]?.ambition === 'art')) act.trust = clamp(act.trust - 3, 0, 100);
  const r = new Rng(seedState(`radio18|${s.config.seed}|${key}`));
  const consRoll: Record<string, boolean> = {};
  const added: string[] = [];
  for (const x of ensureStations18(s).filter((k) => k.fmt === f)) {
    const o = addOdds18(s, rel, x, how, edit);
    const ok = x.cons ? (consRoll[x.cons] ??= r.chance(o.p)) : r.chance(o.p);
    if (!ok) continue;
    (st.rot[relId] ??= []).push({ st: x.id, lvl: 1, w: s.week });
    added.push(x.call);
    st.n.adds++;
  }
  if (how === 'indie') {
    const who = `${r.pick(FIRST)} "${r.pick(['Big', 'The Fixer', 'Smiley', 'Doc', 'Ace'])}" ${r.pick(LAST)}`;
    st.paid.push({ w: s.week, rel: relId, act: rel.actId, who, amt: cost });
    if (st.paid.length > 30) st.paid.shift();
    const p = w4(s).payola;
    p.heat = clamp(p.heat + (s.year >= 1960 ? 8 : 3), 0, 100);
    addHeat(s, 'player', countryOfCity(s.config.homeCity) ?? 'USA', 3);
    emitFact(s, { kind: 'payola', actors: ['player', rel.actId], severity: 35, visibility: 'secret', tags: ['crime', 'payola', 'radio'], text: fmtL(l('O selo pagou {w} para levar "{t}" às rádios.', 'The label paid {w} to get "{t}" on the radio.'), { w: who, t: rel.title }), data: { promoter: who }, src: 'radio18' });
  }
  return added.length
    ? fmtL(l('Adicionada em {n}: {l}. Começa em rotação leve; sobe se vender.', 'Added at {n}: {l}. Starts in light rotation; climbs if it sells.'), { n: added.length, l: added.join(', ') })
    : l('Nenhuma estação adicionou. Os diretores ouviram e passaram.', 'No station added it. The PDs listened and passed.');
}

/** jantar com o diretor de programação: relação +8 (uma vez a cada 8 semanas) */
export function lunchPd18(s: GameState, stId: string): L {
  const x = radio18(s).st.find((k) => k.id === stId);
  if (!x) return l('Estação inválida.', 'Invalid station.');
  if ((x.lunch ?? -99) > s.week - 8) return l('Vocês jantaram há pouco.', 'You dined recently.');
  const cost = money(s, 200);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `r18l:${stId}`, -cost, 'promo', `Jantar com ${x.pd}`);
  x.lunch = s.week; x.rel = clamp(x.rel + 8, 0, 100);
  return fmtL(l('{pd} gostou da conversa (relação {r}).', '{pd} enjoyed the talk (relationship {r}).'), { pd: x.pd, r: x.rel });
}

/** força da rotação de um lançamento (soma alcance × nível de cada estação) */
export function spins18(s: GameState, relId: string): number {
  const st = radio18(s);
  return (st.rot[relId] ?? []).reduce((t, r) => { const x = st.st.find((k) => k.id === r.st); return t + (x ? x.reach * FMT18[x.fmt].reach * r.lvl : 0); }, 0);
}

registerMod('chartUnits', 'radio18', (s, v, c) => {
  const rel = c.release;
  if (!rel || rel.owner !== 'player') return null;
  const sp = spins18(s, rel.id);
  if (!sp) return null;
  const k = 1 + Math.min(0.6, 0.05 * sp) * radioWeight18(s);
  return { value: v * k, label: l('Rotação nas rádios', 'Radio rotation') };
});

registerSimHook('month', 'radio18', (s) => {
  if (!hasTech(s, 'radio')) return;
  ensureStations18(s);
  const st = radio18(s);
  const r = new Rng(seedState(`radio18m|${s.config.seed}|${s.year * 12 + s.month}`));
  for (const [rid, rots] of Object.entries(st.rot)) {
    const rel = s.releases[rid];
    if (!rel) { delete st.rot[rid]; continue; }
    const w = rel.weekly, n = w.length;
    const up = n >= 4 && w[n - 1] + w[n - 2] >= (w[n - 3] + w[n - 4]) * 0.95;
    const charting = rel.lastPos > 0 && rel.lastPos <= 40;
    for (const ro of rots) {
      const x = st.st.find((k) => k.id === ro.st);
      if (!x) { ro.lvl = 0; continue; }
      const age = s.week - ro.w;
      if ((up || charting) && ro.lvl < 3 && r.chance(charting ? 0.7 : 0.45)) {
        ro.lvl++;
        if (ro.lvl === 3) { st.n.heavy++; x.rel = clamp(x.rel + 4, 0, 100); const act = s.acts[rel.actId]; if (act) act.fame = clamp(act.fame + 0.8, 0, 100); }
      } else if (age > 6 && !charting && r.chance(0.5)) ro.lvl--;
      if (age > 30) ro.lvl = Math.min(ro.lvl, 1);
    }
    st.rot[rid] = rots.filter((x) => x.lvl > 0);
    if (!st.rot[rid].length) delete st.rot[rid];
  }
  // "quem pagou, quem filmou": o pagamento a promotor independente pode vazar
  for (const p of st.paid) {
    if (p.out || s.week - p.w > 156) continue;
    const heat = w4(s).payola.heat;
    if (!r.chance(0.01 + heat / 900)) continue;
    p.out = true; st.n.exposed++;
    const act = s.acts[p.act], rel = s.releases[p.rel];
    const text = fmtL(l('Reportagem mostra recibos: {w} recebeu {v} do selo para tocar "{t}" de {a}.', 'Report shows receipts: {w} got {v} from the label to get "{t}" by {a} played.'), { w: p.who, v: `$${Math.round(p.amt / 100).toLocaleString('en-US')}`, t: rel?.title ?? '?', a: act?.name ?? '?' });
    emitFact(s, { kind: 'payola', actors: ['player', p.act], severity: 55, visibility: 'public', tags: ['crime', 'payola', 'radio', 'scandal'], text, data: { promoter: p.who }, src: 'radio18' });
    if (act) scandal(s, act.id, 'money', 35, text);
    w4(s).payola.heat = clamp(w4(s).payola.heat + 15, 0, 100);
    for (const k of st.rot[p.rel] ?? []) k.lvl = 0;
    delete st.rot[p.rel];
    remember(s, 'payola', text, { actId: p.act, important: true });
    pushInbox18(s, 'radio18_leak', { from: 'Imprensa', subject: l('Jabá exposto', 'Payola exposed'), body: fmtL(l('{t}\nAs rádios tiram a faixa do ar por medo. A investigação de jabá ganha força (risco maior).', '{t}\nStations pull the track out of fear. The payola probe gains steam (higher risk).'), { t: text }), tone: 'bad', ref: { act: p.act } });
    notify(s, text, 'bad');
    break;
  }
  for (const k of Object.keys(st.tried)) if (st.tried[k] < s.week - 104) delete st.tried[k];
});

registerInboxKind('radio18_leak', { label: l('Rádio', 'Radio'), cat: 'press', icon: 'radio', prio: 3, goto: () => ({ area: 'media' }) });

registerAdvisorTip('radio18', (s) => {
  if (!hasTech(s, 'radio') || radioWeight18(s) < 0.5) return [];
  const st = radio18(s);
  const out: ReturnType<Parameters<typeof registerAdvisorTip>[1]> = [];
  for (const id of playerActs(s)) for (const rid of (s.acts[id]?.releases ?? []).slice(-1)) {
    const rel = s.releases[rid];
    if (!rel || rel.owner !== 'player' || s.week - rel.week > 6 || Object.keys(st.tried).some((k) => k.startsWith(`${rid}|`))) continue;
    out.push({ id: `radio18-${rid}`, level: 'info', cat: 'release', score: 48, text: fmtL(l('Leve "{t}" às rádios.', 'Take "{t}" to radio.'), { t: rel.title }), why: [l('Na reunião de programação, cada formato decide; com consultor, dezenas de rádios decidem juntas.', 'At the programming meeting each format decides; with a consultant, dozens of stations decide together.')], goto: { area: 'media' } });
  }
  return out;
});

registerExplain('radio.add', (s, c) => {
  const rel = s.releases[String(c.rel ?? '')];
  const x = radio18(s).st.find((k) => k.id === String(c.st ?? ''));
  if (!rel || !x) return null;
  const o = addOdds18(s, rel, x, (c.how as How18) ?? 'self', !!c.edit);
  return { title: fmtL(l('Chance de {c} adicionar', 'Chance {c} adds it'), { c: x.call }), value: Math.round(o.p * 100), fmt: 'pct', parts: o.why.map((w) => ({ label: w, value: '', fmt: 'text' as const })), note: FMT18[x.fmt].desc };
});
