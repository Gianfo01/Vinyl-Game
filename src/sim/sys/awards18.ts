// Rodada 18 (society18, frente H — A1/A2) — POLÍTICA DOS PRÊMIOS E DAS PARADAS.
// A1: o corpo de votantes tem idade e gosto por época (jazz e canção de standards antes de 1965; rock nos 80-90; rap
// sub-reconhecido até a reforma de membros de 2019 — no modo exato na data real, nos outros o lobby antecipa/atrasa).
// Campanhas além do anúncio "para sua consideração" (ceremonies8): audições para votantes (rende mais com votantes
// velhos), lobby/jantares (forte, mas pode virar "compra de voto" ou desclassificação) e campanha nas redes (2010+, rende
// com votantes jovens). Fadiga de voto (quem ganhou demais perde força), prêmio de "compensação" depois de uma esnobada,
// e faixas geradas por IA inelegíveis (regra de autoria humana, 2023). Esnobada de um sucesso → boicote (fãs fiéis
// +, institucional −, compensação no ano seguinte), protesto público (rixa com a academia, empurra a reforma) ou silêncio.
// A2: regras das paradas mudam por mercado e data reais (SoundScan 1991, airplay 1998, downloads 2005, streams 2012/2014,
// YouTube 2013, unidades equivalentes 2014, bundles 2017-2020); cada regra mexe no peso dos gêneros; bundles valem
// enquanto a regra deixa (e podem virar notícia de "parada comprada"); lobby junto ao órgão da parada.

import { clamp, Rng } from '../../core/rng';
import { familyOf, l, type FamilyId, type L, type MarketId } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { histMode } from '../history15';
import { grantHold } from '../holds17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { scandal } from '../scandal17';
import type { GameState, Release } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { isGenRel18 } from './ai18';
import { aw15 } from './awards15';
import { GRAMO_ADJ, NOMS_MONTH, nominees } from './ceremonies8';
import { AWARD_ADJ18, type Comm18 } from './screen18';

// ---------------------------------------------------------------- estado

export type Camp18 = 'screen' | 'lobby' | 'social';
export interface Awards18 {
  camps: { rel: string; k: Camp18; y: number }[];
  makeup: Record<string, number>;
  snub: { y: number; act: string; ch?: string }[];
  /** ano da reforma de membros (no exato fica 2019) */
  reformY: number;
  /** atraso/antecipação das regras de parada por lobby (anos) */
  shift: Record<string, number>;
  done: string[];
  bundles: Record<string, number>;
  insider: string[];
  dq: Record<string, number>;
  log: { y: number; t: L }[];
}
declare module '../ext4' { interface Ext4 { aw18: Awards18 } }
const init = (): Awards18 => ({ camps: [], makeup: {}, snub: [], reformY: 2019, shift: {}, done: [], bundles: {}, insider: [], dq: {}, log: [] });
registerExt4('aw18', init);
export function aw18(s: GameState): Awards18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.aw18 ??= init()) as Awards18;
  st.camps ??= []; st.makeup ??= {}; st.snub ??= []; st.shift ??= {}; st.done ??= []; st.bundles ??= {}; st.insider ??= []; st.dq ??= {}; st.log ??= []; st.reformY ??= 2019;
  return st;
}
const logW = (s: GameState, t: L) => { const st = aw18(s); st.log.unshift({ y: s.year, t }); if (st.log.length > 30) st.log.length = 30; };
const exact = (s: GameState) => histMode(s) === 'strict';
const mine = (s: GameState, rel: Release) => rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand;

// ---------------------------------------------------------------- A1: votantes

export interface Voters18 { era: L; age: number; young: number; n: number; bias: Partial<Record<FamilyId, number>>; reformed: boolean }
export function voters18(s: GameState): Voters18 {
  const y = s.year, st = aw18(s);
  const reformed = y >= (exact(s) ? 2019 : st.reformY);
  if (reformed) return { era: l('Pós-reforma: milhares de membros novos, mais jovens e diversos', 'Post-reform: thousands of new, younger and more diverse members'), age: 44, young: 0.42, n: 13000, reformed, bias: { hiphop: 2, rnb: 3, latin: 2, pop: 2, rock: 0, electronic: 0, blues_jazz: 1, country_folk: 0 } };
  if (y < 1965) return { era: l('Academia dos standards: jazz, orquestras e canção', 'Academy of standards: jazz, orchestras and song'), age: 54, young: 0.08, n: 2000, reformed, bias: { blues_jazz: 7, pop: 4, country_folk: 1, rock: -7, rnb: -3, sacred: 2 } };
  if (y < 1980) return { era: l('Velha guarda: o rock entra devagar', 'Old guard: rock gets in slowly'), age: 52, young: 0.12, n: 4500, reformed, bias: { pop: 4, blues_jazz: 5, rock: -2, rnb: -1, country_folk: 2, electronic: -5 } };
  if (y < 2000) return { era: l('Era do rock: o rap fica fora da cerimônia televisionada', 'Rock era: rap is kept off the televised ceremony'), age: 50, young: 0.15, n: 9000, reformed, bias: { rock: 5, pop: 3, rnb: 1, country_folk: 1, hiphop: -7, electronic: -5, latin: -2 } };
  return { era: l('Mainstream conservador: rap ganha categoria, não o prêmio principal', 'Conservative mainstream: rap gets a category, not the top prize'), age: 49, young: 0.2, n: 11000, reformed, bias: { pop: 3, rock: 2, rnb: 1, hiphop: -4, electronic: -3, latin: -2, country_folk: 1 } };
}
export const CAMP18: Record<Camp18, { name: L; desc: L; cost: number; from: number }> = {
  screen: { name: l('Audições para votantes', 'Listening sessions for voters'), desc: l('+5 pontos; rende 30% mais com votantes acima dos 50.', '+5 points; 30% more with voters over 50.'), cost: 9000, from: 1958 },
  lobby: { name: l('Lobby e jantares', 'Lobbying and dinners'), desc: l('+9 pontos; pode virar "compra de voto" (escândalo) ou desclassificação.', '+9 points; may become "vote buying" (scandal) or disqualification.'), cost: 22000, from: 1958 },
  social: { name: l('Campanha nas redes', 'Social media campaign'), desc: l('+3 a +7 conforme a fatia de votantes jovens.', '+3 to +7 depending on the share of young voters.'), cost: 5000, from: 2010 },
};
export function campPts18(s: GameState, k: Camp18): number {
  const v = voters18(s);
  return k === 'screen' ? 5 * (v.age > 50 ? 1.3 : 1) : k === 'lobby' ? 9 : 3 + v.young * 10;
}
/** Ajuste total de um lançamento (pontos somados ao placar do prêmio), com porquê. */
export function relAdj18(s: GameState, rel: Release): { v: number; why: [L, number][] } {
  const st = aw18(s), why: [L, number][] = [];
  const act = s.acts[rel.actId];
  if (s.year >= 2023 && isGenRel18(s, rel.id)) return { v: -999, why: [[l('Inelegível: faixa gerada por IA (regra de autoria humana, 2023)', 'Ineligible: AI-generated (human-authorship rule, 2023)'), -999]] };
  if (st.dq[rel.id] === s.year) return { v: -999, why: [[l('Desclassificado por violar as regras de campanha', 'Disqualified for breaking campaign rules'), -999]] };
  const b = act ? voters18(s).bias[familyOf(act.genre)] ?? 0 : 0;
  if (b) why.push([l('Gosto do corpo de votantes', 'Voting body taste'), b]);
  for (const c of st.camps) if (c.rel === rel.id && c.y === s.year) why.push([CAMP18[c.k].name, Math.round(campPts18(s, c.k))]);
  if (act && (st.makeup[act.id] ?? 0) === s.year) why.push([l('Compensação pela esnobada do ano passado', 'Make-up for last year\'s snub'), 6]);
  if (act) { const wins = s.awards.filter((a) => a.actId === act.id && a.year >= s.year - 3).length; if (wins >= 2) why.push([l('Fadiga de voto (ganhou demais)', 'Voter fatigue (won too much)'), -4 * (wins - 1)]); }
  return { v: why.reduce((t, x) => t + x[1], 0), why };
}
GRAMO_ADJ.push((s, relId) => { const rel = s.releases[relId]; return rel ? relAdj18(s, rel).v : 0; });

export function campaign18(s: GameState, relId: string, k: Camp18): L | null {
  const rel = s.releases[relId];
  if (!rel || !mine(s, rel)) return l('Só lançamentos seus.', 'Only your releases.');
  if (rel.year !== s.year) return l('Só concorre quem saiu este ano.', 'Only this year\'s releases compete.');
  if (s.year < CAMP18[k].from) return l('Ainda não existe nesta época.', 'Not available in this era yet.');
  if (s.month >= 11) return l('A votação já fechou.', 'Voting has closed.');
  const st = aw18(s);
  if (st.camps.some((c) => c.rel === relId && c.k === k && c.y === s.year)) return l('Essa campanha já está rodando.', 'That campaign is already running.');
  const cost = money(s, CAMP18[k].cost);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `aw18:${relId}:${k}`, -cost, 'marketing', `Campanha de prêmio (${CAMP18[k].name.pt}): ${rel.title}`);
  st.camps.push({ rel: relId, k, y: s.year });
  if (st.camps.length > 40) st.camps.shift();
  if (k === 'lobby') {
    const r = Rng.fromSeed(`${s.config.seed}|aw18lobby|${relId}|${s.year}`);
    if (r.chance(s.year >= 2000 ? 0.18 : 0.08)) {
      scandal(s, rel.actId, 'money', 35, fmtL(l('Jantares com votantes: campanha de "{t}" acusada de comprar voto', 'Dinners with voters: the "{t}" campaign accused of buying votes'), { t: rel.title }), { tags: ['awards', 'aw18', 'lobby'] });
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100);
      if (r.chance(0.3)) { st.dq[relId] = s.year; logW(s, fmtL(l('"{t}" é desclassificada da premiação por violar as regras de campanha.', '"{t}" is disqualified for breaking campaign rules.'), { t: rel.title })); }
    }
  }
  return null;
}
// trilhas de cinema/TV/musical usam o mesmo corpo de votantes (velhos gostam de orquestra, jovens de ousadia)
AWARD_ADJ18.f = (s: GameState, c: Comm18): [L, number][] => {
  const v = voters18(s), out: [L, number][] = [];
  if (c.ap === 'orch' && v.age > 50) out.push([l('Votantes veteranos amam orquestra', 'Veteran voters love orchestras'), 4]);
  if (c.ap === 'bold' && v.young > 0.3) out.push([l('Votantes jovens premiam ousadia', 'Young voters reward boldness'), 3]);
  if ((c.fyc ?? 0) > 0) out.push([l('Campanha "para sua consideração"', '"For your consideration" campaign'), 6]);
  return out;
};
export function fycScore18(s: GameState, id: string, list: Comm18[]): L | null {
  const c = list.find((x) => x.id === id);
  if (!c || c.st !== 'done' || c.nom) return l('Só trilhas lançadas e ainda não indicadas.', 'Only released, not yet nominated scores.');
  if (c.fyc) return l('Campanha já feita.', 'Campaign already done.');
  const v = money(s, 7000);
  if (s.player.cash < v) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `aw18fyc:${id}`, -v, 'marketing', `Campanha de prêmio de trilha: ${c.title}`);
  c.fyc = 1;
  return null;
}

// esnobadas: sucesso nas paradas sem indicação
function snubCheck(s: GameState): void {
  const st = aw18(s);
  const noms = new Set(['record', 'album', 'newcomer', 'performance'].flatMap((c) => nominees(s, c as 'record') ?? []));
  if (!noms.size) return;
  const nomActs = new Set([...noms].map((id) => s.releases[id]?.actId));
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || nomActs.has(id) || st.snub.some((x) => x.act === id && x.y === s.year)) continue;
    const hit = a.releases.map((rid) => s.releases[rid]).find((r) => r && r.year === s.year && r.peak > 0 && r.peak <= 5 && !isGenRel18(s, r.id));
    if (!hit) continue;
    st.snub.push({ y: s.year, act: id });
    if (st.snub.length > 30) st.snub.shift();
    pushInbox18(s, 'aw18_snub', { from: a.name, subject: fmtL(l('{a} foi esnobado pela academia', '{a} was snubbed by the academy'), { a: a.name }),
      body: fmtL(l('"{t}" chegou ao #{p} e ficou sem indicação. Boicotar a cerimônia (fãs fiéis +, institucional −, compensação provável no ano que vem), protestar em público (rixa com a academia; empurra a reforma dos votantes) ou ficar quieto (o artista se ressente).', '"{t}" reached #{p} and got no nomination. Boycott the ceremony (core fans +, institutional −, likely make-up next year), protest publicly (feud with the academy; pushes voter reform) or stay quiet (the artist resents it).'), { t: hit.title, p: hit.peak }),
      ref: { act: id }, actions: [{ id: 'boycott', label: l('Boicotar', 'Boycott') }, { id: 'protest', label: l('Protestar', 'Protest') }, { id: 'quiet', label: l('Ficar quieto', 'Stay quiet') }], weeks: 5 });
  }
}
export function snubReact18(s: GameState, actId: string, ch: 'boycott' | 'protest' | 'quiet'): L {
  const st = aw18(s), a = s.acts[actId], x = st.snub.find((k) => k.act === actId && k.y === s.year && !k.ch);
  if (!a || !x) return l('Nada a decidir.', 'Nothing to decide.');
  x.ch = ch;
  if (ch === 'boycott') {
    aw15(s).boycott[actId] = s.year;
    a.fans.core = Math.round(a.fans.core * 1.04);
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
    st.makeup[actId] = s.year + 1;
    emitFact(s, { kind: 'boycott', actors: [actId], severity: 45, visibility: 'public', tags: ['awards', 'aw18'], src: 'aw18', place: a.city, text: fmtL(l('{a} boicota a cerimônia: "esse prêmio não fala com a minha geração".', '{a} boycotts the ceremony: "this award does not speak to my generation".'), { a: a.name }) });
    return l('Boicote anunciado.', 'Boycott announced.');
  }
  if (ch === 'protest') {
    a.fame = clamp(a.fame + 1, 0, 100);
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
    if (!exact(s) && st.reformY > s.year + 1) st.reformY = Math.max(s.year + 1, st.reformY - 1);
    emitFact(s, { kind: 'statement', actors: [actId], severity: 50, visibility: 'public', tags: ['awards', 'aw18', 'feud'], src: 'aw18', place: a.city, text: fmtL(l('{a} ataca a academia: "votantes velhos que não ouvem o que o país ouve".', '{a} blasts the academy: "old voters who don\'t hear what the country hears".'), { a: a.name }) });
    return l('Protesto público: a pressão por reforma cresce.', 'Public protest: pressure for reform grows.');
  }
  a.trust = clamp(a.trust - 3, 0, 100);
  return l('Silêncio. O artista acha que o selo não o defendeu.', 'Silence. The artist feels the label did not defend them.');
}
registerInboxKind('aw18_snub', { label: l('Prêmios', 'Awards'), cat: 'decision', icon: 'trophy', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, a) => snubReact18(s, String(m.ref?.act), a as 'boycott' | 'protest' | 'quiet') });
/** Lobby pela reforma dos votantes (fora do modo exato muda a data). */
export function lobbyReform18(s: GameState, dir: 1 | -1): L | null {
  const st = aw18(s);
  if (s.year >= (exact(s) ? 2019 : st.reformY)) return l('A reforma já aconteceu.', 'The reform already happened.');
  const v = money(s, 15000);
  if (s.player.cash < v) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `aw18ref:${s.year}`, -v, 'misc', 'Lobby na academia');
  if (exact(s)) { grantHold(s, { holder: 'player', target: 'academy', kind: 'favor', strength: 30, text: l('A academia lembra do seu apoio', 'The academy remembers your support'), src: 'aw18' }); return l('Modo exato: a reforma segue a data real (2019), mas a academia lhe deve um favor.', 'Exact mode: the reform keeps its real date (2019), but the academy owes you a favour.'); }
  const r = Rng.fromSeed(`${s.config.seed}|aw18ref|${s.week}`);
  if (!r.chance(clamp(0.25 + s.player.reputation.institutional / 200, 0.1, 0.75))) return l('A academia ouve e não muda nada.', 'The academy listens and changes nothing.');
  st.reformY = clamp(st.reformY - dir * 2, s.year + 1, 2035);
  logW(s, fmtL(l('Lobby muda a data da reforma de votantes para {y} (história alternativa).', 'Lobbying moves the voter reform to {y} (alternate history).'), { y: st.reformY }));
  return null;
}

// ---------------------------------------------------------------- A2: regras das paradas

export interface Rule18 { id: string; y: number; m: number; mk: MarketId; name: L; desc: L; fam?: Partial<Record<FamilyId, number>>; bundle?: 1; unbundle?: 1 }
export const RULES18: Rule18[] = [
  { id: 'soundscan', y: 1991, m: 4, mk: 'na', name: l('Contagem no caixa (SoundScan)', 'Point-of-sale tracking (SoundScan)'), desc: l('Acaba o "palpite" das lojas: country e rap aparecem do tamanho real.', 'Store "guesswork" ends: country and rap show their real size.'), fam: { country_folk: 0.06, hiphop: 0.06, rock: -0.02 } },
  { id: 'airplay', y: 1998, m: 11, mk: 'na', name: l('Faixa sem single comercial entra na parada', 'Tracks without a commercial single can chart'), desc: l('A execução em rádio basta: hits de rádio pop e R&B sobem.', 'Airplay alone is enough: pop and R&B radio hits climb.'), fam: { pop: 0.03, rnb: 0.02 } },
  { id: 'digital', y: 2005, m: 1, mk: 'na', name: l('Downloads pagos contam', 'Paid downloads count'), desc: l('A loja digital entra na conta.', 'The digital store enters the count.'), fam: { pop: 0.03, electronic: 0.02 } },
  { id: 'stream_us', y: 2012, m: 2, mk: 'na', name: l('Streams sob demanda contam', 'On-demand streams count'), desc: l('Quem ouve repetidamente pesa mais: rap e R&B ganham.', 'Repeat listeners weigh more: rap and R&B gain.'), fam: { hiphop: 0.05, rnb: 0.02, rock: -0.03 } },
  { id: 'youtube', y: 2013, m: 1, mk: 'na', name: l('Views de vídeo contam', 'Video views count'), desc: l('O vídeo viral vira número 1 (caso "Harlem Shake").', 'The viral video becomes number one (the "Harlem Shake" case).'), fam: { electronic: 0.03, latin: 0.03, pop: 0.02 } },
  { id: 'stream_uk', y: 2014, m: 6, mk: 'eu', name: l('Streams entram na parada britânica', 'Streams enter the UK chart'), desc: l('A parada europeia se aproxima do público jovem.', 'The European chart moves toward young listeners.'), fam: { hiphop: 0.05, electronic: 0.04, rock: -0.03 } },
  { id: 'units', y: 2014, m: 11, mk: 'na', name: l('Álbum medido em unidades equivalentes', 'Album chart in equivalent units'), desc: l('Streams e faixas avulsas viram "álbuns": discos de streaming sobem.', 'Streams and single tracks become "albums": streaming records rise.'), fam: { hiphop: 0.04, rock: -0.02 } },
  { id: 'bundles', y: 2017, m: 0, mk: 'na', name: l('Pacotes com merch e ingresso contam', 'Merch and ticket bundles count'), desc: l('Camiseta + álbum = venda de álbum: abre a brecha dos bundles.', 'T-shirt + album = an album sale: the bundle loophole opens.'), bundle: 1 },
  { id: 'paid', y: 2018, m: 5, mk: 'na', name: l('Stream pago vale mais que grátis', 'Paid streams weigh more than free'), desc: l('Assinante pesa mais que ouvinte de plano grátis.', 'Subscribers weigh more than free-tier listeners.'), fam: { pop: 0.01 } },
  { id: 'nobundle', y: 2020, m: 9, mk: 'na', name: l('Fim dos bundles', 'Bundles banned'), desc: l('Pacotes de merch e ingresso deixam de contar.', 'Merch and ticket bundles stop counting.'), unbundle: 1 },
];
export const ruleDate18 = (s: GameState, r: Rule18): number => r.y + (exact(s) ? 0 : aw18(s).shift[r.id] ?? 0);
export const ruleOn18 = (s: GameState, r: Rule18): boolean => s.year > ruleDate18(s, r) || (s.year === ruleDate18(s, r) && s.month >= r.m);
export const rulesNow18 = (s: GameState): Rule18[] => RULES18.filter((r) => ruleOn18(s, r));
/** Regras em debate público (até 2 anos antes): nunca mostra o futuro distante. */
export const rulesDebated18 = (s: GameState): Rule18[] => RULES18.filter((r) => !ruleOn18(s, r) && ruleDate18(s, r) - s.year <= 2);
export const bundlesOk18 = (s: GameState): boolean => { const on = rulesNow18(s); return on.some((r) => r.bundle) && !on.some((r) => r.unbundle); };

export function ruleMult18(s: GameState, rel: Release): { v: number; why: [L, number][] } {
  const act = s.acts[rel.actId];
  const why: [L, number][] = [];
  if (act) {
    const f = familyOf(act.genre);
    let t = 0;
    for (const r of rulesNow18(s)) { const d = r.fam?.[f]; if (d && rel.territories.includes(r.mk)) { t += d; why.push([r.name, 1 + d]); } }
    if (t) { const c = clamp(t, -0.1, 0.1); if (c !== t) why.push([l('Teto do efeito das regras', 'Rule effect cap'), (1 + c) / (1 + t)]); }
  }
  const b = aw18(s).bundles[rel.id];
  if (b && s.week < b && bundlesOk18(s)) why.push([l('Bundle com merch/ingresso', 'Merch/ticket bundle'), 1.15]);
  return { v: why.reduce((t, x) => t * x[1], 1), why };
}
registerMod('chartUnits', 'aw18', (s, v, c) => {
  if (!c.release || s.year < 1991) return null;
  const m = ruleMult18(s, c.release);
  return m.v !== 1 ? { value: v * m.v, label: l('Regras da parada', 'Chart rules') } : null;
});
export const bundleCost18 = (s: GameState, rel: Release) => money(s, 4000 * (0.5 + (s.acts[rel.actId]?.fame ?? 20) / 50));
export function bundle18(s: GameState, relId: string): L | null {
  const rel = s.releases[relId];
  if (!rel || !mine(s, rel)) return l('Só lançamentos seus.', 'Only your releases.');
  if (!bundlesOk18(s)) return l('A regra atual não conta pacotes.', 'The current rule does not count bundles.');
  if (s.week - rel.week > 4) return l('Bundle só nas 4 primeiras semanas.', 'Bundles only in the first 4 weeks.');
  const st = aw18(s);
  if (st.bundles[relId]) return l('Já tem bundle.', 'Already bundled.');
  const v = bundleCost18(s, rel);
  if (s.player.cash < v) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `aw18bun:${relId}`, -v, 'merch', `Bundle de merch: ${rel.title}`);
  st.bundles[relId] = s.week + 8;
  const r = Rng.fromSeed(`${s.config.seed}|aw18bun|${relId}`);
  if (r.chance(0.12)) {
    scandal(s, rel.actId, 'money', 25, fmtL(l('"{t}" chegou ao topo vendendo camiseta: imprensa fala em parada comprada', '"{t}" topped the chart selling T-shirts: the press calls it a bought chart'), { t: rel.title }), { tags: ['charts', 'aw18', 'bundle'] });
    const a = s.acts[rel.actId]; if (a) a.fans.casual = Math.round(a.fans.casual * 0.98);
  }
  return null;
}
export function lobbyRule18(s: GameState, id: string, dir: 1 | -1): L | null {
  const r0 = RULES18.find((x) => x.id === id);
  if (!r0 || ruleOn18(s, r0) || !rulesDebated18(s).includes(r0)) return l('Essa regra não está em debate.', 'That rule is not under debate.');
  const v = money(s, 15000);
  if (s.player.cash < v) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `aw18rl:${id}:${s.week}`, -v, 'misc', `Lobby junto ao órgão da parada: ${r0.name.pt}`);
  const st = aw18(s);
  if (!st.insider.includes(id)) st.insider.push(id);
  const r = Rng.fromSeed(`${s.config.seed}|aw18rule|${id}|${s.week}`);
  if (r.chance(0.1)) emitFact(s, { kind: 'statement', actors: ['player'], severity: 30, visibility: 'public', tags: ['charts', 'aw18', 'lobby'], src: 'aw18', place: s.config.homeCity, text: fmtL(l('Vaza: {c} fez lobby sobre a regra "{r}".', 'Leak: {c} lobbied over the "{r}" rule.'), { c: s.config.companyName, r: r0.name }) });
  if (exact(s)) return l('Modo exato: a data real não muda, mas você sabe antes e se prepara (informação privilegiada).', 'Exact mode: the real date does not move, but you know early and prepare (insider info).');
  const share = s.stats.marketShare ?? 0;
  if (!r.chance(clamp(0.2 + s.player.reputation.institutional / 250 + share * 2, 0.1, 0.8))) return l('O órgão da parada não se mexe.', 'The chart body does not budge.');
  st.shift[id] = clamp((st.shift[id] ?? 0) + (dir > 0 ? -1 : 1), -3, 3);
  logW(s, fmtL(l('Lobby muda a regra "{r}" para {y} (história alternativa).', 'Lobbying moves the "{r}" rule to {y} (alternate history).'), { r: r0.name, y: ruleDate18(s, r0) }));
  return null;
}

// ---------------------------------------------------------------- mês

registerSimHook('month', 'aw18', (s) => {
  const st = aw18(s);
  for (const r of RULES18) {
    if (st.done.includes(r.id) || !ruleOn18(s, r)) continue;
    st.done.push(r.id);
    if (s.year - ruleDate18(s, r) > 1) continue; // regra antiga ao começar a partida: já é o mundo
    const t = fmtL(l('Nova regra da parada: {n}. {d}', 'New chart rule: {n}. {d}'), { n: r.name, d: r.desc });
    emitFact(s, { kind: 'law', actors: [], severity: 40, visibility: 'public', tags: ['charts', 'aw18'], src: 'aw18', text: t });
    logW(s, t);
  }
  if (s.month === NOMS_MONTH + 1) snubCheck(s);
  if (s.month === 0) { for (const [k, y] of Object.entries(st.makeup)) if (y < s.year) delete st.makeup[k]; for (const [k, w] of Object.entries(st.bundles)) if (w < s.week) delete st.bundles[k]; }
  if (!exact(s) && s.year === st.reformY && s.month === 2) {
    const t = l('A academia convida milhares de membros novos, mais jovens e diversos: muda quem vota.', 'The academy invites thousands of new, younger and more diverse members: who votes changes.');
    emitFact(s, { kind: 'law', actors: [], severity: 45, visibility: 'public', tags: ['awards', 'aw18', 'reform'], src: 'aw18', text: t }); logW(s, t);
  }
});

registerExplain('aw18.adj', (s, c) => {
  const rel = s.releases[String(c.rel)];
  if (!rel) return null;
  const a = relAdj18(s, rel);
  return { title: l('Política do prêmio', 'Award politics'), value: a.v, fmt: 'signed', parts: a.why.map(([label, value]) => ({ label, value, fmt: 'signed' as const })), note: voters18(s).era };
});
registerExplain('aw18.rules', (s, c) => {
  const rel = s.releases[String(c.rel)];
  if (!rel) return null;
  const m = ruleMult18(s, rel);
  return { title: l('Regras da parada', 'Chart rules'), value: m.v, fmt: 'mult', parts: m.why.map(([label, value]) => ({ label, value, fmt: 'mult' as const })), note: l('Cada regra mexe no peso dos gêneros nos mercados onde vale (teto ±10%).', 'Each rule shifts genre weight in the markets where it applies (cap ±10%).') };
});
registerAdvisorTip('aw18', (s) => {
  const out = [] as ReturnType<Parameters<typeof registerAdvisorTip>[1]>;
  if (s.month >= 7 && s.month <= 10) {
    const best = Object.values(s.releases).filter((r) => r.year === s.year && mine(s, r) && r.peak > 0 && r.peak <= 10 && !aw18(s).camps.some((c) => c.rel === r.id && c.y === s.year)).sort((a, b) => a.peak - b.peak)[0];
    if (best) out.push({ id: `aw18-camp-${best.id}`, level: 'info', cat: 'release', score: 38, text: fmtL(l('"{t}" pode concorrer: campanha com votantes antes de outubro.', '"{t}" could compete: voter campaign before October.'), { t: best.title }), why: [voters18(s).era], goto: { area: 'society18', tab: ['society18', 'awards'] } });
  }
  if (bundlesOk18(s)) { const r = Object.values(s.releases).find((x) => mine(s, x) && s.week - x.week <= 4 && !aw18(s).bundles[x.id]); if (r) out.push({ id: `aw18-bundle-${r.id}`, level: 'info', cat: 'release', score: 30, text: fmtL(l('Regra atual conta bundles: "{t}" ganharia +15% na parada por 8 semanas.', 'Current rule counts bundles: "{t}" would get +15% on the chart for 8 weeks.'), { t: r.title }), goto: { area: 'society18', tab: ['society18', 'charts'] } }); }
  return out;
});
