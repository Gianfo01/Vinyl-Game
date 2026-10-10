// Rodada 18 (cine18) — camada de COMPOSIÇÃO de cenas: cena = local-base + atores (avatares com estado) + objetos +
// efeitos + legendas, montada a partir do ESTADO e das DECISÕES (discurso escolhido vira balão; sair x aplaudir vira
// pose; figurino do tapete vermelho; palco do kit de turnê/prédios próprios; tamanho e humor da plateia pelo fandom;
// protesto e imprensa pelos escândalos recentes; lesões; formação atual da banda; clima e época). Cada momento grande
// vira um STORYBOARD de 3 a 8 quadros (Board18) que a interface anima e deixa pular. Puro (sem DOM): testável.
// Momentos: cerimônia completa (tapete, indicados com retrato, apresentador, envelope, vencedor, reação, subida,
// discurso, festa), nº 1 nas paradas, assinatura, estádio lotado, estreia, veredito, funeral, vitória em programa
// musical (K-pop), headline de festival, Hall da Fama e shows póstumos (holograma, avatar, ilusão de Pepper, tributo).

import { clamp, hashString } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { onFact, recentFacts, type Fact } from '../facts17';
import { climateAt } from '../travel';
import type { Act, GameState } from '../types';
import { fmtL } from '../util';
import { isEstate } from './image17';
import { fans18 } from './fans18';
import { l16 } from './lineup16';
import { live18 } from './live18';
import { Fx17, OFF_S17, ctx17, mineOf17, pend17, result17 } from './scene17';
import { queueScene, type PlaceKind } from './scenes/state';
import { soul } from './soul9';
import { kinOf15 } from './kin15';
import { buildings18 } from './campus18';

// ---------------------------------------------------------------- tipos

export type Pose18 = 'stand' | 'walk' | 'sit' | 'play' | 'sitplay';
export type Dir18 = 'SE' | 'SW' | 'NE' | 'NW';
export type Mood18 = 'joy' | 'sad' | 'angry' | 'calm' | 'shock' | 'cry';
export type Crowd18 = 'cheer' | 'wild' | 'quiet' | 'boo' | 'mixed' | 'grief';
export type Fx18 = 'spot' | 'confetti' | 'flash' | 'flicker' | 'rain' | 'snow' | 'pyro' | 'envelope' | 'gold' | 'lights' | 'smoke';
export type Prop18 = 'carpet' | 'rope' | 'podium' | 'trophy' | 'cameras' | 'protest' | 'screen' | 'casket' | 'flowers' | 'candles' | 'pen' | 'gavel'
  | 'chart' | 'banner' | 'glass' | 'lightsticks' | 'umbrellas' | 'table' | 'mic' | 'barrier';
export type Kind18 = 'awards' | 'number1' | 'signing' | 'soldout' | 'premiere' | 'verdict' | 'funeral' | 'musicshow' | 'festival' | 'hall'
  | 'hologram' | 'avatar' | 'ghost' | 'tribute';

export interface Actor18 {
  pid?: string; seed?: string; name?: string;
  /** posição absoluta no quadro 256×144 (pés) */
  x: number; y: number; pose?: Pose18; dir?: Dir18; mark?: boolean;
  /** 1 = ilusão de Pepper (vidro), 2 = holograma/avatar digital */
  ghost?: 1 | 2;
  /** visual sem a idade (avatar rejuvenescido, estilo ABBA Voyage) */
  young?: boolean;
  bubble?: L; mood?: Mood18;
  /** caminha até (x, y) durante o quadro */
  to?: [number, number];
  /** figurino [modelo 0..3, cor] */
  outfit?: [number, number];
  inj?: boolean;
}
export interface Nom18 { name: string; pid?: string; seed: string; mine: boolean; win?: boolean }
export interface Frame18 {
  id: string; place: PlaceKind; variant?: number; year: number;
  actors: Actor18[]; props: Prop18[]; fx: Fx18[];
  crowd: { n: number; mood: Crowd18; signs?: string[] };
  caption: L; sub?: L; ms: number;
  noms?: Nom18[]; env?: { cat: L; name: string; win: boolean }; banner?: string;
  /** a interface encaixa aqui a decisão pendente (figurino, discurso, reação) */
  slot?: 'outfit' | 'speech' | 'reaction' | 'farewell';
  /** 0..1 escurece o fundo */
  dark?: number;
}
export interface Board18 { id: string; k: Kind18; title: L; year: number; frames: Frame18[]; why: L[] }
export interface Shot18 { id: string; k: Kind18; y: number; m: number; w: number; act?: string; pid?: string; city?: string; text?: L; fact?: string; cs?: string; aw?: Aw18; d?: Record<string, string | number> }
export interface Aw18 { cs: string; year: number; cats: { id: string; name: L; nominees: { name: string; mine: boolean; actId?: string }[]; winner: number; mine?: boolean }[]; won: number; actId?: string | null; rivalId?: string | null; rivalName?: string | null }
export interface Cine18St { log: Shot18[]; seq: number; fit: Record<string, Fit18>; seen: Record<string, number> }

declare module '../ext4' { interface Ext4 { cine18: Cine18St } }
const fresh = (): Cine18St => ({ log: [], seq: 0, fit: {}, seen: {} });
registerExt4('cine18', fresh);
export function cine18(s: GameState): Cine18St {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.cine18 ??= fresh()) as Cine18St;
  st.log ??= []; st.fit ??= {}; st.seen ??= {}; st.seq ??= 0;
  return st;
}

const F = fmtL;
const ms = (n: number) => n;
const seedN = (k: string) => hashString(k) >>> 0;

// ---------------------------------------------------------------- leitores de estado (o "porquê" da composição)

/** Figurinos do tapete vermelho (decisão de imagem). */
export type Fit18 = 'classic' | 'bold' | 'statement' | 'brand';
export const FIT18: Record<Fit18, { name: L; hint: L; look: [number, number]; from: number }> = {
  classic: { name: l('Clássico e elegante', 'Classic and elegant'), hint: l('Reputação no setor; nenhuma manchete.', 'Industry reputation; no headlines.'), look: [1, 6], from: 1900 },
  bold: { name: l('Ousado (vira assunto)', 'Daring (gets talked about)'), hint: l('Fama e fotos; uma parte do público torce o nariz.', 'Fame and photos; part of the public frowns.'), look: [3, 9], from: 1955 },
  statement: { name: l('Roupa-manifesto', 'Statement outfit'), hint: l('Fãs fiéis e prestígio; conservadores e censores anotam.', 'Core fans and prestige; conservatives and censors take note.'), look: [2, 1], from: 1965 },
  brand: { name: l('Grife emprestada (patrocínio)', 'Loaned designer look (sponsored)'), hint: l('Cachê da grife; crítica acha "vendido".', 'Designer fee; critics call it "sold out".'), look: [1, 3], from: 1990 },
};
export const fitsNow18 = (y: number): Fit18[] => (Object.keys(FIT18) as Fit18[]).filter((k) => y >= FIT18[k].from);

/** Figurino padrão pelo que o ato é (imagem pública, gênero, época). */
export function outfitOf18(s: GameState, a: Act | undefined, key?: string): [number, number] | undefined {
  const f = key ? cine18(s).fit[key] : undefined;
  if (f) return FIT18[f].look;
  if (!a) return undefined;
  if (s.year < 1955) return [1, 6];
  const im = a.image;
  if (/punk|metal|rock/.test(a.genre)) return [3, 6];
  if (im && im.publicImage < 35) return [3, 1];
  if (im && im.artistic > 70) return [2, 4];
  return [1, (seedN(a.id) % 4) + 5];
}

/** Lesão recente (fato de saúde/acidente nos últimos 3 meses). */
export function injured18(s: GameState, pid: string | undefined, actId?: string): boolean {
  if (!pid) return false;
  return recentFacts(s, { months: 3, kinds: ['health', 'tour_accident', 'injury', 'stage_incident'] }).some((f) => f.actors.includes(pid) || (!!actId && f.actors.includes(actId) && /injur|ferid|machuc|hurt/i.test(f.text.en + f.text.pt)))
    || recentFacts(s, { months: 3, tag: 'mem:injury' }).some((f) => !!actId && f.actors.includes(actId));
}

/** Escândalo forte recente: vira protesto e imprensa na porta. */
export function heat18(s: GameState, actId?: string): Fact | undefined {
  if (!actId) return undefined;
  return recentFacts(s, { kind: 'scandal', months: 6, actor: actId, minSev: 35, notSecret: true, limit: 1 })[0];
}

/** Plateia: tamanho pelo fandom e humor pelo fandom (fans18: lealdade, cansaço) e pelos escândalos. */
export function crowd18(s: GameState, a: Act | undefined, base = 0.7): { n: number; mood: Crowd18; signs: string[]; why: L[] } {
  const why: L[] = [];
  if (!a) return { n: base * 0.6, mood: 'cheer', signs: [], why };
  const fans = a.fans.core + a.fans.active + a.fans.casual * 0.15;
  const n = clamp(base * (0.3 + Math.log10(1 + fans) / 6.5), 0.12, 1);
  const f = fans18(s).a[a.id];
  let mood: Crowd18 = 'cheer';
  const signs: string[] = [];
  if (f && f.fat >= 55) { mood = 'quiet'; why.push(l('Fãs cansados de tanto lançamento: plateia morna.', 'Fans tired of too many releases: a lukewarm crowd.')); }
  else if (f && f.loy >= 70) { mood = 'wild'; why.push(l('Fandom leal: a plateia pula e canta tudo.', 'Loyal fandom: the crowd jumps and sings every word.')); }
  const h = heat18(s, a.id);
  if (h) {
    mood = 'mixed';
    signs.push(s.year >= 2009 ? `#CANCEL${a.name.split(' ')[0].toUpperCase().slice(0, 8)}` : 'BOICOTE', s.year >= 1965 ? 'VERGONHA' : 'FORA');
    why.push(F(l('Escândalo recente ("{t}"): protesto e imprensa na porta.', 'Recent scandal ("{t}"): protest and press at the door.'), { t: h.text }));
  }
  if (a.fans.core > 2000 && signs.length < 3) signs.push(s.year >= 2009 ? `#${a.name.replace(/\W/g, '').toUpperCase().slice(0, 9)}` : `${a.name.split(' ')[0].toUpperCase().slice(0, 9)}!`);
  return { n, mood, signs, why };
}

/** Clima do lugar no mês (só importa ao ar livre). */
export function weather18(s: GameState, city?: string): Fx18 | null {
  const k = climateAt(city ?? s.config.homeCity, s.month).kind;
  return k === 'rain' || k === 'storm' || k === 'monsoon' ? 'rain' : k === 'snow' ? 'snow' : null;
}

/** Palco pelo kit da última turnê (live18) e pelos prédios próprios (campus18). */
export function stage18(s: GameState, a: Act | undefined): { fx: Fx18[]; props: Prop18[]; banner?: string; why: L[] } {
  const why: L[] = [];
  const fx: Fx18[] = ['lights'];
  const props: Prop18[] = [];
  const pm = a ? live18(s).pm.filter((x) => x.act === a.id).slice(-1)[0] : undefined;
  if (pm?.kit.prom === 'giant') { fx.push('pyro'); why.push(l('Turnê com promotora gigante: pirotecnia e telões.', 'Tour with a giant promoter: pyro and big screens.')); }
  if (s.year >= 1985 && (pm?.kit.prom === 'giant' || (a?.fame ?? 0) >= 60)) props.push('screen');
  if ((pm?.kit.sec ?? 0) >= 1) { props.push('barrier'); why.push(l('Segurança reforçada no kit: grade na frente do palco.', 'Reinforced security in the kit: barrier in front of the stage.')); }
  if ((pm?.kit.reh ?? 0) >= 2) why.push(l('Ensaios caprichados: banda entrosada no palco.', 'Thorough rehearsals: a tight band on stage.'));
  let banner: string | undefined;
  try {
    const v = buildings18(s).find((b) => (b.kind === 'venue' || b.kind === 'fest') && b.st === 'open' && (!a || b.city === a.city));
    if (v) { banner = v.name.toUpperCase().slice(0, 18); why.push(F(l('Casa própria ({v}): o letreiro é seu.', 'Your own venue ({v}): the sign is yours.'), { v: v.name })); }
  } catch { /* campus indisponível em testes mínimos */ }
  return { fx, props, banner, why };
}

/** Mudança recente de formação (lineup16): estreia de alguém ou primeira vez sem alguém. */
export function lineup18(s: GameState, a: Act | undefined): L | null {
  if (!a) return null;
  const mk = s.year * 12 + s.month;
  const ev = l16(s).ev.filter((e) => e[1] === a.id && mk - e[0] <= 18).slice(-1)[0];
  if (!ev) return null;
  const p = s.persons[ev[2]];
  if (!p) return null;
  return ev[3] === 'j' ? F(l('Primeira grande noite de {p} na formação.', '{p}\'s first big night in the lineup.'), { p: p.name }) : F(l('A primeira vez sem {p} — o lugar vazio é notado.', 'The first time without {p} — the empty spot is noticed.'), { p: p.name });
}

/** Facetas que decidem a reação ao perder/ganhar. */
function temper18(s: GameState, pid?: string): Mood18 {
  const p = pid ? s.persons[pid] : undefined;
  if (!p) return 'calm';
  const f = soul(s, p).f;
  if ((f.ego ?? 50) > 66 || (f.impulsividade ?? 50) > 72) return 'angry';
  if ((f.melancolia ?? 50) > 70 || (f.ansiedade ?? 50) > 72) return 'sad';
  if ((f.empatia ?? 50) > 62 || (f.generosidade ?? 50) > 66) return 'joy';
  return 'calm';
}
const REACT18: Record<Mood18, L> = {
  angry: l('Roubado!', 'Robbed!'), sad: l('(olhos marejados)', '(teary eyes)'), joy: l('Merecido! Palmas!', 'Deserved! Bravo!'),
  calm: l('(aplauso educado)', '(polite applause)'), shock: l('Não acredito!', 'I can\'t believe it!'), cry: l('(chora)', '(cries)'),
};

/** Membros vivos (formação atual) como atores, com figurino, lesão e idade (o visual envelhece na interface). */
export function members18(s: GameState, a: Act | undefined, at: [number, number][], o: { pose?: Pose18; dir?: Dir18; key?: string; ghostDead?: boolean } = {}): Actor18[] {
  if (!a) return [];
  const fit = outfitOf18(s, a, o.key);
  const ids = a.members.filter((id) => s.persons[id] && (o.ghostDead || s.persons[id].alive));
  return ids.slice(0, at.length).map((pid, i) => ({ pid, name: s.persons[pid].name, x: at[i][0], y: at[i][1], pose: o.pose, dir: o.dir, mark: i === 0, outfit: fit, inj: injured18(s, pid, a.id), ghost: o.ghostDead && !s.persons[pid].alive ? 2 : undefined }));
}

const crowdOf = (c: ReturnType<typeof crowd18>, mood?: Crowd18) => ({ n: c.n, mood: mood ?? c.mood, signs: c.signs.length ? c.signs : undefined });

// ---------------------------------------------------------------- cerimônia de premiação completa

const SPEECH18: Record<string, L> = {
  team: l('Isso é de todos: banda, técnicos, a equipe inteira!', 'This belongs to everyone: band, crew, the whole team!'),
  family: l('Mãe, pai… isso é pra vocês.', 'Mom, Dad… this is for you.'),
  god: l('Antes de tudo: obrigado, meu Deus.', 'First of all: thank you, God.'),
  political: l('Não dá pra calar sobre o que acontece lá fora.', 'I can\'t stay silent about what\'s happening out there.'),
  rival: l('{r}, guarda esse lugar pra mim ano que vem… ah, não precisa.', '{r}, save me a seat next year… oh wait, no need.'),
  humble: l('Obrigado. De verdade.', 'Thank you. Truly.'),
};
const LOSE18: Record<string, { bubble: L; mood: Mood18; pose: Pose18 }> = {
  applaud: { bubble: l('Merecido! Bravo!', 'Deserved! Bravo!'), mood: 'joy', pose: 'stand' },
  stage: { bubble: l('Espera aí! Deixa eu falar!', 'Hold on! Let me speak!'), mood: 'angry', pose: 'walk' },
  still: { bubble: l('(sorriso congelado)', '(frozen smile)'), mood: 'calm', pose: 'sit' },
  walkout: { bubble: l('Tô fora.', 'I\'m out.'), mood: 'angry', pose: 'walk' },
  party: { bubble: l('Garçom, a festa é onde?', 'Waiter, where\'s the party?'), mood: 'sad', pose: 'stand' },
};

const hostName18 = (y: number): L => (y < 1960 ? l('o mestre de cerimônias de smoking', 'the tuxedoed master of ceremonies') : y < 1990 ? l('o apresentador da TV', 'the TV host') : y < 2012 ? l('a dupla de apresentadores', 'the presenting duo') : l('a apresentadora (e a transmissão ao vivo)', 'the host (and the live stream)'));

/** Herdeiro que sobe ao palco quando o vencedor já morreu. */
export function heirOf18(s: GameState, a: Act | undefined): { pid?: string; name: string } | null {
  if (!a || !isEstate(s, a)) return null;
  for (const id of a.members) {
    const k = kinOf15(s, id).find((x) => x.p.alive && (x.rel === 'child' || x.rel === 'spouse' || x.rel === 'sibling'));
    if (k) return { pid: k.p.id, name: k.p.name };
  }
  return { name: F(l('a família de {a}', '{a}\'s family'), { a: a.name }).pt };
}

export function awardBoard18(s: GameState, aw: Aw18): Board18 {
  const year = aw.year ?? s.year;
  const won = aw.won > 0;
  const cats = aw.cats ?? [];
  const cat = cats.find((c) => c.nominees.some((n) => n.mine)) ?? cats[0];
  const myN = cat?.nominees.find((n) => n.mine);
  const actId = (won ? aw.actId : undefined) ?? myN?.actId ?? aw.actId ?? undefined;
  const a = actId ? s.acts[actId] : undefined;
  const key = `aw:${aw.cs}`;
  const r = result17(s, key);
  const p = pend17(s, key);
  const picks = r?.picks ?? p?.ctx.picks ?? [];
  const pk = picks[0];
  const fitK = cine18(s).fit[key];
  const cr = crowd18(s, a, 0.85);
  const why: L[] = [...cr.why];
  const wx = weather18(s, a?.city);
  const heat = heat18(s, a?.id);
  const lu = lineup18(s, a);
  if (lu) why.push(lu);
  if (fitK) why.push(F(l('Figurino escolhido: {f}.', 'Outfit chosen: {f}.'), { f: FIT18[fitK].name }));
  const winner = cat ? cat.nominees[cat.winner] : undefined;
  const winAct = winner?.actId ? s.acts[winner.actId] : undefined;
  const heir = heirOf18(s, winAct);
  const catName = cat?.name ?? l('Prêmio', 'Award');
  const fr: Frame18[] = [];
  const base = { year, variant: 0 } as const;
  // 1 tapete vermelho
  const carpetActors: Actor18[] = [
    ...members18(s, a, [[112, 112], [132, 116], [152, 112]], { pose: 'walk', dir: 'SE', key }),
    { seed: `rep1:${aw.cs}`, x: 52, y: 104, dir: 'SE', bubble: heat ? F(l('E o escândalo, {a}?', 'What about the scandal, {a}?'), { a: a?.name ?? '' }) : l('Quem você está vestindo?', 'Who are you wearing?') },
    { seed: `rep2:${aw.cs}`, x: 72, y: 124, dir: 'NE' },
  ];
  fr.push({ id: 'carpet', place: 'street', ...base, actors: carpetActors, props: ['carpet', 'rope', 'cameras', ...(wx === 'rain' ? ['umbrellas' as Prop18] : []), ...(heat ? ['protest' as Prop18] : [])], fx: ['flash', ...(wx ? [wx] : [])],
    crowd: crowdOf(cr), caption: F(l('Tapete vermelho — {c}', 'Red carpet — {c}'), { c: year }), sub: heat ? l('A imprensa só quer falar do escândalo.', 'The press only wants to talk about the scandal.') : wx === 'rain' ? l('Chove: guarda-chuvas e flashes refletidos no chão.', 'Rain: umbrellas and flashes reflected on the ground.') : l('Flashes, gritos de fãs, perguntas sobre a roupa.', 'Flashes, fans screaming, questions about the outfit.'),
    ms: ms(3200), slot: a && !fitK && !r ? 'outfit' : undefined });
  // 2 indicados com retrato
  if (cat) fr.push({ id: 'noms', place: 'awards', ...base, actors: [], props: ['screen'], fx: ['spot'], crowd: { n: cr.n, mood: 'quiet' }, dark: 0.35,
    caption: F(l('Os indicados para {c}', 'The nominees for {c}'), { c: catName }),
    noms: cat.nominees.slice(0, 5).map((n) => ({ name: n.name, pid: n.actId ? s.acts[n.actId]?.members[0] : undefined, seed: `nom:${n.name}`, mine: n.mine })), ms: ms(3400) });
  // 3 apresentador no púlpito
  const seats = [[60, 122], [100, 126], [156, 126], [196, 122]] as [number, number][];
  const nomActs: Actor18[] = (cat?.nominees ?? []).slice(0, 4).map((n, i) => {
    const na = n.actId ? s.acts[n.actId] : undefined;
    const pid = na?.members.find((id) => s.persons[id]?.alive) ?? na?.members[0];
    return { pid, seed: pid ? undefined : `nom:${n.name}`, name: n.name, x: seats[i][0], y: seats[i][1], pose: 'sit', dir: 'NE', mark: n.mine, outfit: n.mine ? outfitOf18(s, a, key) : undefined, mood: n.mine ? 'shock' : 'calm' };
  });
  const host: Actor18 = { seed: `host:${year}`, x: 128, y: 78, dir: 'SE', outfit: [1, 6] };
  fr.push({ id: 'host', place: 'awards', ...base, actors: [{ ...host, bubble: F(l('E o Gramofone de {c} vai para…', 'And the Gramophone for {c} goes to…'), { c: catName }) }, ...nomActs], props: ['podium'], fx: ['spot'], crowd: { n: cr.n, mood: 'quiet' },
    caption: F(l('No púlpito: {h}', 'At the podium: {h}'), { h: hostName18(year) }), ms: ms(3000) });
  // 4 envelope
  fr.push({ id: 'env', place: 'awards', ...base, actors: [{ ...host }, ...nomActs], props: ['podium'], fx: ['spot', 'envelope'], crowd: { n: cr.n, mood: 'quiet' }, dark: 0.45,
    caption: l('Abrindo o envelope…', 'Opening the envelope…'), env: { cat: catName, name: winner?.name ?? '—', win: !!winner?.mine }, ms: ms(3600) });
  // 5 vencedor: holofote e reações (vencedor, perdedores pelos traços, você pela decisão)
  const reactors = nomActs.map((x, i): Actor18 => {
    const n = cat!.nominees[i];
    const isWin = cat!.winner === i;
    if (isWin) return { ...x, mood: 'joy', pose: 'stand', bubble: heir && !n.mine ? l('(a família se abraça)', '(the family embraces)') : l('Não acredito!', 'I can\'t believe it!'), mark: true };
    if (n.mine) {
      const lo = pk ? LOSE18[pk] : undefined;
      return lo ? { ...x, mood: lo.mood, pose: lo.pose, bubble: lo.bubble, to: pk === 'walkout' ? [252, 140] : pk === 'stage' ? [128, 84] : undefined, dir: pk === 'walkout' ? 'SE' : x.dir } : { ...x, mood: 'shock', bubble: l('(a câmera corta para você)', '(the camera cuts to you)') };
    }
    const m = temper18(s, x.pid);
    return { ...x, mood: m, bubble: REACT18[m] };
  });
  fr.push({ id: 'win', place: 'awards', ...base, actors: [host, ...reactors], props: ['podium', 'trophy'], fx: ['spot', ...(winner?.mine ? ['confetti' as Fx18] : [])], crowd: { n: cr.n, mood: winner?.mine ? (cr.mood === 'mixed' ? 'mixed' : 'wild') : 'cheer' },
    caption: F(winner?.mine ? l('{w} vence! O holofote encontra a sua mesa.', '{w} wins! The spotlight finds your table.') : l('{w} leva o troféu.', '{w} takes the trophy.'), { w: winner?.name ?? '—' }),
    sub: !winner?.mine && myN ? (pk ? F(l('Sua reação: {r}.', 'Your reaction: {r}.'), { r: LOSE18[pk]?.bubble ?? l('—', '—') }) : l('As câmeras esperam a sua reação.', 'The cameras wait for your reaction.')) : heir ? F(l('Prêmio póstumo: quem sobe é {h}.', 'Posthumous award: {h} goes up.'), { h: heir.name }) : undefined,
    ms: ms(3400), slot: !winner?.mine && myN && !r && p ? 'reaction' : undefined });
  if (winner?.mine && a) {
    // 6 subida ao palco
    fr.push({ id: 'walk', place: 'awards', ...base, actors: [host, ...members18(s, a, [[100, 126], [84, 124], [116, 128]], { key, pose: 'walk', dir: 'NE' }).map((x, i) => (i === 0 ? { ...x, to: [128, 84] as [number, number] } : x))],
      props: ['podium', 'trophy'], fx: ['spot', 'confetti'], crowd: { n: cr.n, mood: cr.mood === 'mixed' ? 'mixed' : 'wild' }, caption: l('A caminhada até o palco (parece não ter fim).', 'The walk to the stage (it seems endless).'), sub: lu ?? undefined, ms: ms(2800) });
    // 7 discurso: balão com o tema escolhido
    const topic = (won ? pk : undefined) ?? '';
    const bub = SPEECH18[topic] ? F(SPEECH18[topic], { r: aw.rivalName ?? 'rival' }) : l('…', '…');
    const angry = topic === 'political' || topic === 'rival';
    const rivalA: Actor18[] = topic === 'rival' && aw.rivalName ? [{ seed: `rival:${aw.rivalId}`, name: aw.rivalName, x: 200, y: 124, pose: 'sit', dir: 'NW', mood: 'angry', bubble: l('(fecha a cara)', '(scowls)') }] : [];
    fr.push({ id: 'speech', place: 'awards', ...base, actors: [{ ...members18(s, a, [[128, 84]], { key })[0], bubble: topic ? bub : undefined, mood: 'joy' }, ...rivalA], props: ['podium', 'trophy', 'mic'], fx: ['spot'],
      crowd: { n: cr.n, mood: !r ? 'quiet' : angry ? (r.ok ? 'mixed' : 'boo') : 'cheer' }, caption: topic ? F(l('Discurso: "{b}"', 'Speech: "{b}"'), { b: bub }) : l('45 segundos antes da música subir.', '45 seconds before the music plays you off.'),
      sub: r ? r.out : undefined, ms: ms(4200), slot: won && !r && p ? 'speech' : undefined });
  } else if (heir && winAct) {
    fr.push({ id: 'heir', place: 'awards', ...base, actors: [{ pid: heir.pid, seed: heir.pid ? undefined : `heir:${winAct.id}`, x: 128, y: 84, dir: 'SE', bubble: l('Ele(a) estaria aqui cantando.', 'They would be up here singing.'), mood: 'cry' }, ...(year >= 2012 ? [{ pid: winAct.members[0], x: 168, y: 72, ghost: 2 as const, dir: 'SW' as Dir18 }] : [])],
      props: ['podium', 'trophy', 'screen'], fx: ['spot', ...(year >= 2012 ? ['flicker' as Fx18] : [])], crowd: { n: cr.n, mood: 'grief' }, caption: F(l('Prêmio póstumo para {a}', 'Posthumous award for {a}'), { a: winAct.name }), ms: ms(3600) });
  }
  // 8 festa depois
  const partyPlace: PlaceKind = year < 1975 ? 'mansion' : 'dance_club';
  const tabloid = pk === 'party' && r && !r.ok;
  fr.push({ id: 'after', place: partyPlace, ...base, actors: members18(s, a, [[110, 104], [130, 108], [150, 104]], { key }).map((x, i) => (i === 0 ? { ...x, mood: winner?.mine ? 'joy' as Mood18 : pk === 'party' ? 'sad' as Mood18 : 'calm' as Mood18, bubble: winner?.mine ? l('Esse troféu vai dormir comigo.', 'This trophy is sleeping with me.') : pk === 'walkout' ? l('Melhor festa é a nossa.', 'Our own party is better.') : undefined } : x)),
    props: winner?.mine ? ['trophy'] : [], fx: ['lights', ...(tabloid ? ['flash' as Fx18] : [])], crowd: { n: 0.4, mood: 'cheer' },
    caption: winner?.mine ? l('A festa depois: champanhe, contatos e o troféu passando de mão em mão.', 'The after-party: champagne, contacts and the trophy passed around.') : tabloid ? l('A festa depois: um paparazzo pega o pior ângulo.', 'The after-party: a paparazzo gets the worst angle.') : l('A festa depois: conversas, promessas e o ano que vem.', 'The after-party: talk, promises and next year.'),
    sub: r?.lines.length ? r.lines[0] : undefined, ms: ms(3400) });
  return { id: key, k: 'awards', title: F(l('Gramófonos de Ouro {y}', 'Golden Gramophones {y}'), { y: year }), year, frames: fr, why };
}

// ---------------------------------------------------------------- outros grandes momentos

export function momentBoard18(s: GameState, sh: Shot18): Board18 {
  const y = sh.y;
  const a = sh.act ? s.acts[sh.act] : undefined;
  const cr = crowd18(s, a);
  const st = stage18(s, a);
  const wx = weather18(s, sh.city ?? a?.city);
  const lu = lineup18(s, a);
  const why: L[] = [...cr.why, ...st.why, ...(lu ? [lu] : [])];
  const name = a?.name ?? sh.text?.pt ?? '';
  const base = { year: y } as const;
  const fr: Frame18[] = [];
  const band = (pose: Pose18 = 'stand', at: [number, number][] = [[128, 74], [104, 78], [152, 78]], dir: Dir18 = 'SE') => members18(s, a, at, { pose, dir });
  let title: L = sh.text ?? l('Momento', 'Moment');
  switch (sh.k) {
    case 'number1': {
      const tv: PlaceKind = y < 1958 ? 'radio_am' : y < 2005 ? 'tv_chart' : y < 2015 ? 'radio_fm' : 'livestream';
      title = F(l('{a} chega ao nº 1', '{a} hits No. 1'), { a: name });
      fr.push({ id: 'count', place: tv, ...base, actors: [{ seed: `dj:${y}`, x: 172, y: 92, dir: 'SW', bubble: l('E no topo desta semana…', 'And at the top this week…') }], props: ['chart', 'mic'], fx: ['lights'], crowd: { n: 0.3, mood: 'quiet' }, caption: y < 1958 ? l('A contagem no rádio, a família colada no aparelho.', 'The radio countdown, the family glued to the set.') : y < 2005 ? l('A parada da semana na TV: 3… 2…', 'The weekly TV chart: 3… 2…') : l('O ranking atualiza ao vivo.', 'The chart updates live.'), ms: 3000 });
      fr.push({ id: 'top', place: tv, ...base, actors: [...band('stand', [[96, 96], [120, 100], [144, 96]])].map((x, i) => (i === 0 ? { ...x, mood: 'joy' as Mood18, bubble: l('NÚMERO UM!', 'NUMBER ONE!') } : x)), props: ['chart'], fx: ['confetti'], crowd: { n: 0.5, mood: 'wild' }, caption: F(l('nº 1: {a}', 'No. 1: {a}'), { a: name }), sub: lu ?? undefined, ms: 3000 });
      fr.push({ id: 'street', place: 'street', ...base, actors: band('walk', [[120, 112], [140, 116], [160, 112]]), props: ['cameras'], fx: ['flash', ...(wx ? [wx] : [])], crowd: crowdOf(cr, cr.mood === 'mixed' ? 'mixed' : 'wild'), caption: l('Na rua, a música sai de todas as janelas (e celulares).', 'On the street, the song plays from every window (and phone).'), ms: 3200 });
      break;
    }
    case 'signing': {
      title = F(l('{a} assina', '{a} signs'), { a: name });
      const gear = y < 1980 ? l('caneta-tinteiro e aperto de mão', 'fountain pen and a handshake') : y < 2005 ? l('advogados, fax e uma pilha de vias', 'lawyers, a fax and a stack of copies') : l('assinatura digital, advogados na chamada', 'digital signature, lawyers on the call');
      fr.push({ id: 'table', place: 'boardroom', ...base, actors: [...band('sit', [[100, 92], [84, 96]], 'NE'), { seed: `exec:${sh.id}`, x: 160, y: 88, pose: 'sit', dir: 'SW', bubble: l('Bem-vindos à família.', 'Welcome to the family.') }], props: ['table', 'pen'], fx: [], crowd: { n: 0, mood: 'quiet' }, caption: F(l('Mesa de assinatura: {g}.', 'Signing table: {g}.'), { g: gear }), ms: 3000 });
      fr.push({ id: 'photo', place: 'boardroom', ...base, actors: [...band('stand', [[110, 96], [92, 100], [128, 100]]), { seed: `exec:${sh.id}`, x: 150, y: 96, dir: 'SW', mood: 'joy' }], props: ['pen', 'cameras'], fx: ['flash'], crowd: { n: 0, mood: 'quiet' }, caption: l('A foto oficial (todo mundo sorri, alguém pisca).', 'The official photo (everyone smiles, someone blinks).'), sub: sh.text, ms: 3000 });
      fr.push({ id: 'news', place: 'street', ...base, actors: band('walk', [[120, 110], [140, 114]]), props: ['cameras'], fx: ['flash'], crowd: crowdOf(cr), caption: l('A notícia corre a cena.', 'The news runs through the scene.'), ms: 2600 });
      break;
    }
    case 'soldout': case 'festival': {
      const fest = sh.k === 'festival';
      const place: PlaceKind = fest ? 'venue_festival' : y >= 1965 ? 'venue_stadium' : y >= 1950 ? 'venue_gym' : 'venue_theatre';
      title = fest ? F(l('{a} fecha o festival', '{a} headlines the festival'), { a: name }) : F(l('{a}: casa lotada', '{a}: sold out'), { a: name });
      const inj = a?.members.some((id) => injured18(s, id, a.id));
      fr.push({ id: 'back', place: 'backstage', ...base, actors: band('stand', [[110, 100], [132, 104], [154, 100]]).map((x, i) => (i === 0 ? { ...x, bubble: inj ? l('Vai doer, mas a gente toca.', 'It\'ll hurt, but we play.') : l('Ouve isso. É tudo pra gente.', 'Listen to that. It\'s all for us.') } : x)), props: [], fx: [], crowd: { n: 0, mood: 'quiet' },
        caption: inj ? l('Camarim: alguém se apresenta machucado (curativo e analgésico).', 'Dressing room: someone performs injured (bandage and painkillers).') : l('Camarim: o rugido da plateia atravessa as paredes.', 'Dressing room: the crowd\'s roar comes through the walls.'), sub: lu ?? undefined, ms: 2800 });
      fr.push({ id: 'walkon', place, ...base, banner: st.banner, actors: band('walk'), props: st.props, fx: [...st.fx, ...(wx && (fest || place === 'venue_stadium') ? [wx] : [])], crowd: crowdOf(cr, cr.mood === 'cheer' ? 'wild' : cr.mood), caption: wx === 'rain' ? l('Entrada no palco debaixo de chuva: ninguém vai embora.', 'Walking on in the rain: nobody leaves.') : l('As luzes apagam. A entrada.', 'The lights go down. The walk-on.'), ms: 3000 });
      fr.push({ id: 'peak', place, ...base, banner: st.banner, actors: band('play'), props: st.props, fx: [...st.fx, 'confetti'], crowd: crowdOf(cr, cr.mood === 'cheer' ? 'wild' : cr.mood), caption: fest ? l('Headline: o campo inteiro canta o refrão.', 'Headline: the whole field sings the chorus.') : l('Lotação esgotada: o estádio vira um coro.', 'Sold out: the stadium becomes a choir.'), sub: sh.text, ms: 3600 });
      break;
    }
    case 'premiere': {
      title = sh.text ?? l('Estreia', 'Premiere');
      fr.push({ id: 'carpet', place: 'street', ...base, actors: band('walk', [[120, 112], [140, 116]]), props: ['carpet', 'rope', 'cameras'], fx: ['flash', ...(wx ? [wx] : [])], crowd: crowdOf(cr), caption: l('Estreia: tapete, letreiro e fãs na grade.', 'Premiere: carpet, marquee and fans at the barrier.'), ms: 3000 });
      fr.push({ id: 'screen', place: 'venue_theatre', ...base, actors: band('sit', [[110, 120], [130, 122]], 'NE'), props: ['screen'], fx: ['spot'], crowd: { n: cr.n, mood: 'quiet' }, dark: 0.5, caption: l('As luzes apagam. A música entra na primeira cena.', 'Lights down. The music comes in on the first scene.'), sub: sh.text, ms: 3400 });
      fr.push({ id: 'ovation', place: 'venue_theatre', ...base, actors: band('stand', [[110, 120], [130, 122]], 'NE'), props: ['screen'], fx: ['lights'], crowd: { n: cr.n, mood: Number(sh.d?.box ?? 0.5) >= 0.6 ? 'wild' : 'cheer' }, caption: Number(sh.d?.box ?? 0.5) >= 0.6 ? l('Aplausos de pé nos créditos.', 'A standing ovation at the credits.') : l('Aplausos educados; a crítica sai digitando.', 'Polite applause; the critics leave typing.'), ms: 3000 });
      break;
    }
    case 'verdict': {
      const good = sh.d?.good === 1;
      title = l('O veredito', 'The verdict');
      fr.push({ id: 'court', place: 'court', ...base, actors: [{ seed: `judge:${sh.id}`, x: 128, y: 60, dir: 'SE' }, ...band('sit', [[96, 112]], 'NE')], props: ['gavel'], fx: [], crowd: { n: 0.4, mood: 'quiet' }, caption: l('Todos de pé. O júri volta.', 'All rise. The jury returns.'), ms: 3000 });
      fr.push({ id: 'ruling', place: 'court', ...base, actors: [{ seed: `judge:${sh.id}`, x: 128, y: 60, dir: 'SE', bubble: good ? l('Improcedente.', 'Dismissed.') : l('Procedente. Culpado.', 'Upheld. Guilty.') }, ...band('stand', [[96, 112]], 'NE').map((x) => ({ ...x, mood: (good ? 'joy' : 'shock') as Mood18 }))], props: ['gavel'], fx: ['spot'], crowd: { n: 0.4, mood: good ? 'cheer' : 'mixed' }, caption: sh.text ?? l('A sentença.', 'The ruling.'), ms: 3400 });
      fr.push({ id: 'steps', place: 'street', ...base, actors: band('walk', [[120, 110]]).map((x) => ({ ...x, bubble: good ? l('A verdade venceu.', 'The truth won.') : l('Sem comentários.', 'No comment.') })), props: ['cameras', ...(heat18(s, a?.id) ? ['protest' as Prop18] : [])], fx: ['flash', ...(wx ? [wx] : [])], crowd: crowdOf(cr, good ? 'cheer' : 'mixed'), caption: l('Na escadaria: microfones, gritos, flashes.', 'On the steps: microphones, shouting, flashes.'), ms: 3000 });
      break;
    }
    case 'funeral': {
      const p = sh.pid ? s.persons[sh.pid] : undefined;
      title = F(l('Adeus a {p}', 'Farewell to {p}'), { p: p?.name ?? name });
      const mourners = (a ? a.members.filter((id) => id !== sh.pid && s.persons[id]?.alive) : []).slice(0, 3);
      fr.push({ id: 'service', place: 'funeral', ...base, actors: mourners.map((pid, i) => ({ pid, x: 96 + i * 26, y: 112, dir: 'NE' as Dir18, mood: 'cry' as Mood18, bubble: i === 0 ? l('Você mudou a minha vida.', 'You changed my life.') : undefined })), props: ['casket', 'flowers'], fx: [...(wx ? [wx] : [])], crowd: { n: 0.5, mood: 'grief' }, caption: l('O velório: flores, silêncio e a música que ele(a) escreveu.', 'The service: flowers, silence and the song they wrote.'), sub: sh.text, ms: 3600 });
      fr.push({ id: 'vigil', place: 'street', ...base, actors: [], props: ['candles', 'flowers'], fx: [...(wx ? [wx] : [])], crowd: { n: clamp(cr.n * 1.2, 0.2, 1), mood: 'grief', signs: [`${(p?.name ?? name).split(' ')[0].toUpperCase().slice(0, 10)} VIVE`] }, caption: l('Vigília dos fãs: velas, cartazes e o refrão cantado baixinho.', 'Fans\' vigil: candles, signs and the chorus sung softly.'), ms: 3400 });
      break;
    }
    case 'musicshow': {
      title = F(l('{a} vence no programa musical', '{a} wins on the music show'), { a: name });
      fr.push({ id: 'stage', place: 'tv_chart', ...base, actors: band('play', [[96, 80], [120, 76], [144, 80], [168, 76]].slice(0, 3) as [number, number][]), props: ['lightsticks'], fx: ['lights'], crowd: crowdOf(cr, 'wild'), caption: l('Palco do programa: coreografia sincronizada, fancham ensaiado.', 'Show stage: synchronized choreography, rehearsed fan chant.'), ms: 3000 });
      fr.push({ id: 'win', place: 'tv_chart', ...base, actors: band('stand', [[110, 84], [134, 84], [158, 84]]).map((x, i) => (i === 0 ? { ...x, mood: 'cry' as Mood18, bubble: l('Fãs, obrigada! Ganhamos!', 'Fans, thank you! We won!') } : { ...x, mood: 'joy' as Mood18 })), props: ['trophy', 'lightsticks'], fx: ['confetti'], crowd: crowdOf(cr, 'wild'), caption: l('Primeiro lugar: troféu, lágrimas e o bis ao vivo (encore stage).', 'First place: trophy, tears and the live encore stage.'), ms: 3200 });
      break;
    }
    case 'hall': {
      const heir = heirOf18(s, a);
      title = F(l('{a} entra para o Hall', '{a} enters the Hall'), { a: name });
      fr.push({ id: 'intro', place: 'awards', variant: 3, ...base, actors: [{ seed: `inductor:${sh.id}`, x: 128, y: 78, dir: 'SE', bubble: l('Sem eles, metade de nós não estaria aqui.', 'Without them, half of us wouldn\'t be here.') }], props: ['podium', 'screen'], fx: ['spot'], crowd: { n: 0.7, mood: 'quiet' }, caption: l('O discurso de indução, com a carreira no telão.', 'The induction speech, with the career on the big screen.'), ms: 3200 });
      fr.push({ id: 'accept', place: 'awards', variant: 3, ...base, actors: heir ? [{ pid: heir.pid, seed: heir.pid ? undefined : `heir:${a?.id}`, x: 128, y: 80, dir: 'SE', mood: 'cry', bubble: l('Em nome dele(a): obrigado.', 'On their behalf: thank you.') }] : band('stand', [[128, 80], [108, 84], [148, 84]]).map((x, i) => (i === 0 ? { ...x, bubble: l('Ainda não acabou.', 'It\'s not over yet.') } : x)), props: ['podium', 'trophy'], fx: ['spot', 'confetti'], crowd: { n: 0.7, mood: heir ? 'grief' : 'wild' }, caption: heir ? l('Indução póstuma: a família recebe a estatueta.', 'Posthumous induction: the family accepts the statuette.') : l('Aceitação: a banda reunida no palco.', 'Acceptance: the band reunited on stage.'), sub: sh.text, ms: 3400 });
      fr.push({ id: 'jam', place: 'awards', variant: 3, ...base, actors: [...band('play', [[128, 74], [104, 78], [152, 78]], 'SE'), ...(heir && y >= 2012 && a ? [{ pid: a.members[0], x: 128, y: 70, ghost: 2 as const, dir: 'SE' as Dir18, pose: 'play' as Pose18 }] : [])], props: ['mic'], fx: ['lights', ...(heir && y >= 2012 ? ['flicker' as Fx18] : [])], crowd: { n: 0.7, mood: 'wild' }, caption: l('A jam final com convidados.', 'The closing all-star jam.'), ms: 3000 });
      break;
    }
    case 'hologram': case 'avatar': case 'ghost': case 'tribute': {
      const p = sh.pid ? s.persons[sh.pid] : a ? s.persons[a.members[0]] : undefined;
      const g: 1 | 2 = sh.k === 'ghost' ? 1 : 2;
      const backl = Number(sh.d?.back ?? 30);
      const q = Number(sh.d?.q ?? 0.6);
      const place: PlaceKind = sh.k === 'ghost' ? 'venue_theatre' : sh.k === 'tribute' ? (y >= 1975 ? 'venue_arena' : 'venue_theatre') : sh.k === 'avatar' ? 'holo_stage' : y >= 2027 ? 'holo_stage' : 'venue_festival';
      title = sh.text ?? title;
      const ghostA: Actor18 = { pid: p?.id, x: 128, y: 74, ghost: g, young: sh.k === 'avatar', pose: 'play', dir: 'SE', mark: true };
      const mood: Crowd18 = backl >= 60 ? 'mixed' : backl >= 40 ? 'cheer' : 'wild';
      const signs = backl >= 50 ? [y >= 2009 ? '#DEIXEMDESCANSAR' : 'DEIXEM DESCANSAR', 'RIP'] : [`${(p?.name ?? '').split(' ')[0].toUpperCase().slice(0, 9)}!`];
      if (sh.k === 'tribute') {
        const guests = String(sh.d?.guests ?? '').split(',').filter((x) => s.persons[x]).slice(0, 3);
        fr.push({ id: 'screen', place, ...base, actors: [], props: ['screen', 'candles'], fx: ['spot'], crowd: { n: cr.n, mood: 'grief' }, dark: 0.4, caption: F(l('No telão, {p} sorri numa foto antiga.', 'On the big screen, {p} smiles in an old photo.'), { p: p?.name ?? name }), ms: 3000 });
        fr.push({ id: 'guests', place, ...base, actors: guests.map((pid, i) => ({ pid, x: 104 + i * 24, y: 76, pose: 'play' as Pose18, dir: 'SE' as Dir18 })), props: ['mic', 'screen'], fx: ['lights'], crowd: { n: cr.n, mood: 'cheer' }, caption: l('Convidados tocam o repertório, cada um do seu jeito.', 'Guests play the songbook, each in their own way.'), sub: sh.text, ms: 3400 });
        fr.push({ id: 'finale', place, ...base, actors: guests.map((pid, i) => ({ pid, x: 104 + i * 24, y: 76, pose: 'stand' as Pose18, dir: 'SE' as Dir18 })), props: ['screen', 'candles'], fx: ['confetti'], crowd: { n: cr.n, mood: 'wild', signs }, caption: l('Final: o público canta sozinho a última música.', 'Finale: the audience sings the last song alone.'), ms: 3200 });
        break;
      }
      const tech = g === 1 ? l('Truque de palco do século XIX: vidro inclinado reflete o ator escondido (Pepper\'s ghost).', '19th-century stage trick: angled glass reflects a hidden performer (Pepper\'s ghost).') : sh.k === 'avatar' ? l('Avatares digitais rejuvenescidos, captura de movimento e uma arena feita sob medida.', 'De-aged digital avatars, motion capture and a purpose-built arena.') : y >= 2027 ? l('Holograma volumétrico: dá a volta no palco.', 'Volumetric hologram: walks around the stage.') : l('Projeção em película inclinada (Pepper\'s ghost digital): só funciona de frente.', 'Projection on an angled foil (digital Pepper\'s ghost): only works head-on.');
      fr.push({ id: 'dark', place, ...base, actors: [], props: g === 1 || y < 2027 ? ['glass'] : [], fx: ['smoke'], crowd: { n: cr.n, mood: 'quiet' }, dark: 0.6, caption: l('Escuro total. Fumaça. Um feixe de luz.', 'Total darkness. Smoke. A beam of light.'), sub: tech, ms: 3000 });
      fr.push({ id: 'appear', place, ...base, actors: [ghostA], props: g === 1 || y < 2027 ? ['glass'] : [], fx: ['flicker', 'spot', 'smoke'], crowd: { n: cr.n, mood: q < 0.6 ? 'quiet' : 'wild' }, dark: 0.3,
        caption: F(sh.k === 'avatar' ? l('{p} surge como era no auge.', '{p} appears as they were at their peak.') : l('{p} "volta" ao palco.', '{p} "returns" to the stage.'), { p: p?.name ?? name }),
        sub: q < 0.6 ? l('A imagem treme e o vale da estranheza incomoda parte do público.', 'The image flickers and the uncanny valley bothers part of the audience.') : l('Parece real. Gente chorando na grade.', 'It looks real. People crying at the barrier.'), ms: 3600 });
      fr.push({ id: 'react', place, ...base, actors: [{ ...ghostA, pose: 'stand' }, ...(sh.d?.heir ? [{ pid: String(sh.d.heir), x: 210, y: 128, dir: 'NW' as Dir18, mood: (backl >= 55 ? 'sad' : 'cry') as Mood18, bubble: backl >= 55 ? l('Não era isso que ele(a) queria.', 'This is not what they wanted.') : l('É como se estivesse aqui.', 'It\'s as if they were here.') }] : [])],
        props: g === 1 || y < 2027 ? ['glass'] : [], fx: ['flicker', 'lights', ...(backl >= 60 ? ['flash' as Fx18] : [])], crowd: { n: cr.n, mood, signs },
        caption: backl >= 60 ? l('Metade aplaude, metade acha macabro — a polêmica toma as manchetes.', 'Half applaud, half find it ghoulish — the controversy takes the headlines.') : l('Aplausos para alguém que não pode ouvir.', 'Applause for someone who cannot hear it.'), sub: sh.text, ms: 3400 });
      break;
    }
    default:
      fr.push({ id: 'one', place: 'street', ...base, actors: band('stand', [[128, 110]]), props: [], fx: [], crowd: crowdOf(cr), caption: sh.text ?? l('—', '—'), ms: 3000 });
  }
  return { id: sh.id, k: sh.k, title, year: y, frames: fr, why };
}

/** Storyboard de um registro do álbum (Cinemateca). */
export function board18(s: GameState, sh: Shot18): Board18 { return sh.k === 'awards' && sh.aw ? awardBoard18(s, sh.aw) : momentBoard18(s, sh); }

/** Cenas interativas (scene17) que ganham storyboard: a escolha vira pose/balão quando já foi feita. */
export function boardOfScene18(s: GameState, key: string): Board18 | null {
  const p = pend17(s, key);
  const r = result17(s, key);
  const def = p?.def ?? r?.def;
  if (!def) return null;
  const c = p?.ctx;
  const act = c?.act ?? r?.act;
  const city = c?.city ?? r?.city;
  const y = c?.year ?? r?.y ?? s.year;
  const sh = (k: Kind18, d?: Shot18['d']): Shot18 => ({ id: key, k, y, m: r?.m ?? s.month, w: r?.w ?? s.week, act, city, pid: c?.pid, text: r?.out, d });
  if (key.startsWith('aw:')) {
    const lg = cine18(s).log.find((x) => x.aw?.cs === key.slice(3));
    if (lg?.aw) return awardBoard18(s, lg.aw);
  }
  switch (def) {
    case 'funeral17': return momentBoard18(s, sh('funeral'));
    case 'court17': return momentBoard18(s, sh('verdict', { good: r?.ok ? 1 : 0 }));
    case 'signing': return momentBoard18(s, sh('signing'));
    case 'fest_head': return momentBoard18(s, sh('festival'));
    case 'show_night': return (c?.tier ?? 0) >= 4 ? momentBoard18(s, sh('soldout')) : null;
    default: return null;
  }
}

// ---------------------------------------------------------------- registro (Cinemateca) e gatilhos

export function logShot18(s: GameState, sh: Omit<Shot18, 'id' | 'y' | 'm' | 'w'> & Partial<Pick<Shot18, 'y'>>): Shot18 {
  const st = cine18(s);
  const x: Shot18 = { id: `c18-${++st.seq}`, y: s.year, m: s.month, w: s.week, ...sh };
  st.log.push(x);
  if (st.log.length > 80) st.log.splice(0, st.log.length - 80);
  return x;
}
const PLACE18: Partial<Record<Kind18, PlaceKind>> = { soldout: 'venue_stadium', festival: 'venue_festival', premiere: 'venue_theatre', verdict: 'court', musicshow: 'tv_chart' };
/** Grava e (nos grandes, no máximo 2 por mês pelo orçamento das cenas menores) abre o storyboard. */
function big18(s: GameState, f: Fact, k: Kind18, d?: Shot18['d'], show = true): void {
  const m = mineOf17(s, f.actors);
  if (!m) return;
  const once = `${k}:${m.act ?? 'p'}:${k === 'number1' || k === 'musicshow' ? '' : s.year}`;
  const st = cine18(s);
  const first = !st.seen[once];
  st.seen[once] = s.week;
  const sh = logShot18(s, { k, act: m.act, pid: m.pid, city: f.place, text: f.text, fact: f.id, d });
  if (!show || !first || OFF_S17.auto || !PLACE18[k]) return;
  queueScene(s, 'cine18', PLACE18[k]!, { title: board18(s, sh).title, shot: sh.id, actId: m.act ?? null }, { minor: true });
}
const tagged = (f: Fact, ...t: string[]) => t.some((x) => f.tags.includes(x));
onFact('chart', (s, f) => { if (tagged(f, 'mem:number1')) big18(s, f, 'number1', undefined, false); }, 'cine18:n1');
onFact('signing', (s, f) => big18(s, f, 'signing', undefined, false), 'cine18:sign');
onFact('case_ruling', (s, f) => { if (!tagged(f, 'crime')) big18(s, f, 'verdict', { good: tagged(f, 'good') ? 1 : 0 }); }, 'cine18:verdict');
onFact('award', (s, f) => { if (tagged(f, 'music_show')) big18(s, f, 'musicshow'); }, 'cine18:music');
onFact('release', (s, f) => { if (tagged(f, 'screen18') && f.severity >= 45) big18(s, f, 'premiere', { box: tagged(f, 'good') ? 0.7 : 0.4 }); }, 'cine18:prem');
onFact('*', (s, f) => {
  if (f.src !== 'memory') return;
  if (tagged(f, 'mem:sellout', 'mem:legendary_show')) big18(s, f, 'soldout');
  else if (tagged(f, 'mem:festival', 'mem:festival8', 'mem:festival9', 'mem:festival12')) big18(s, f, 'festival');
  else if (tagged(f, 'mem:hall_of_fame', 'mem:hall')) big18(s, f, 'hall', undefined, false);
}, 'cine18:mem');
onFact('death', (s, f) => {
  const pid = f.actors.find((id) => s.persons[id]);
  if (!pid) return;
  const m = mineOf17(s, [pid]);
  if (m) logShot18(s, { k: 'funeral', act: m.act, pid, city: f.place, text: f.text, fact: f.id });
}, 'cine18:death');

/** Cerimônias entram no álbum com os dados mínimos para remontar o storyboard. */
registerSimHook('week', 'cine18', (s) => {
  const st = cine18(s);
  for (const cs of s.cutscenes ?? []) {
    if (cs.kind !== 'awards' || cs.week !== s.week || st.log.some((x) => x.aw?.cs === cs.id)) continue;
    const d = cs.data as Record<string, unknown>;
    const aw: Aw18 = { cs: cs.id, year: Number(d.year ?? s.year), cats: (d.cats as Aw18['cats']) ?? [], won: Number(d.won ?? 0), actId: (d.actId as string) ?? null, rivalId: (d.rivalId as string) ?? null, rivalName: (d.rivalName as string) ?? null };
    logShot18(s, { k: 'awards', act: aw.actId ?? aw.cats.flatMap((c) => c.nominees).find((n) => n.mine)?.actId, aw, text: d.title as L });
  }
});

/** Para os dados de prêmio vindos direto do cartão (a interface não precisa esperar o gancho). */
export function awOfCs18(s: GameState, cs: { id: string; data: Record<string, unknown> }): Aw18 {
  const d = cs.data;
  return { cs: cs.id, year: Number(d.year ?? s.year), cats: (d.cats as Aw18['cats']) ?? [], won: Number(d.won ?? 0), actId: (d.actId as string) ?? null, rivalId: (d.rivalId as string) ?? null, rivalName: (d.rivalName as string) ?? null };
}
export const shot18 = (s: GameState, id: string): Shot18 | undefined => cine18(s).log.find((x) => x.id === id);

/** Decisão de imagem no tapete vermelho: muda o figurino em todos os quadros e tem consequência. */
export function chooseFit18(s: GameState, key: string, fit: Fit18, actId?: string): { out: L; lines: L[] } | null {
  const st = cine18(s);
  if (st.fit[key] || !FIT18[fit] || s.year < FIT18[fit].from) return null;
  st.fit[key] = fit;
  const a = actId ? s.acts[actId] : undefined;
  const e = new Fx17(s, ctx17(s, { act: a?.id, pid: a?.members[0], place: 'awards' }), `fit:${key}`);
  let out: L;
  if (fit === 'classic') { e.rep('institutional', 2); out = l('Elegância sem risco: os jurados aprovam, as revistas nem tanto.', 'Risk-free elegance: juries approve, magazines less so.'); }
  else if (fit === 'bold') { e.fame(1.5).haters(300).photo(l('O figurino que parou o tapete vermelho', 'The outfit that stopped the red carpet')); out = l('O figurino vira o assunto da noite — para o bem e para o mal.', 'The outfit becomes the talk of the night — for better and worse.'); }
  else if (fit === 'statement') { e.fans(120, 0).rep('artistic', 2); e.news(F(l('{a} usa roupa-manifesto no tapete vermelho.', '{a} wears a statement outfit on the red carpet.'), { a: a?.name ?? s.config.companyName }), 40, ['statement', 'awards'], 'public', 'statement'); out = l('A mensagem na roupa roda o mundo; nem todos gostam.', 'The message on the outfit goes around the world; not everyone likes it.'); }
  else { e.cash(1500 + (a?.fame ?? 10) * 60, 'designer loan').rep('artistic', -1); out = l('A grife paga e posta; a crítica chama de "vitrine".', 'The designer pays and posts; critics call it a "shop window".'); }
  return { out, lines: e.lines };
}
