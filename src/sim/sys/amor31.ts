// R31 · onda 4 (AMOR) — CHAMAR QUALQUER PESSOA PARA SAIR, SER AMANTE E ROMANCE COM O MERCADO.
// Por cima do que já existe (sem duplicar): o relacionamento oficial continua em `life.partner` (namoro → noivado →
// casamento, sys/life.ts) e o caso secreto em `love17.affair` (traição, descoberta, divórcio, pensões, sys/love17.ts).
// Aqui entra só o que faltava:
//
//  · chamar para sair QUALQUER pessoa adulta e viva (integrante, líder de selo 'l:', crítico 'c:', empresário 'e:',
//    produtor 'pd:'), pela ficha, pelo menu de ações de pessoa, pelo painel rápido ou clicando nela numa cena. A
//    resposta é determinística (sorte pura por chave: semente + pessoa + mês; repetir no mesmo mês dá o mesmo) e sai de
//    fatores visíveis antes do clique (conhecimento, opinião, química, charme, idade, estado civil, fama relativa, traços,
//    elenco/sócio/rival, atração pela orientação). Recusa sempre diz o motivo (o fator que mais pesou contra).
//  · ser amante: você comprometido(a) → caso (love17.affair); você solteiro(a) e a pessoa casada → você vira o(a)
//    amante dela (love17.pm, pelo gancho AMOR17.pm). Risco de descoberta mensal soma (gancho AMOR17.risk): quem sabe
//    (holds abertos contra você), imprensa da época (colunas sociais → paparazzi → redes) e fofoqueiros.
//  · descoberta (fato 'affair' com a etiqueta 'exposed', emitido pelo love17): a imprensa fica com um trunfo
//    (chantagem possível), o boato escala para notícia em semanas (pesa no valor do selo: value31 'affair'), sócios e
//    família do par mudam de opinião pela moral da época e do país, e o par pode pedir o divórcio na justiça (partilha do
//    bolso do dono, love17.divorce17).
//  · romance com o mercado (dono de selo rival, crítico, rádio/mídia, empresário, sócio, artista do seu elenco): abre
//    acesso (um segredo do lado de lá vira trunfo seu, uma vez), gera conflito de interesse (sócios e banda com ciúme,
//    crítico perde credibilidade quando vira público) e término ruim vira rixa (feud18) ou mágoa (hold 'grievance').
//  · casal de artistas (fama somada no mês; término vira matéria-prima de disco), casamento como evento de mídia, par com
//    carreira própria que pede ajuda, aniversários no calendário, presentes da loja (H) que chegam ao par.
//  · consentimento sempre: a pessoa pode recusar e pode terminar (opinião no chão ou cansaço do caso).
//  · família Fossati (e Gianluca): NUNCA alvo — trava explícita e única em `romanceLock31`, testada.
//
// Interruptores (src/sim/r31/switches.ts): 'amor31.ask' (chamar qualquer um), 'amor31.affair' (amantes; quem não quer
// esse conteúdo desliga) e 'amor31.market' (romance com o mercado). Desligados = comportamento antigo (o "flertar" do
// menu de pessoa volta). Estado em `x4.amor31`. Explorar (chance, motivos, ficha) só lê. O robô não namora.

import { clamp, hashString, Rng } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { FAMILY31, famById31, famKey31 } from '../../data/fossati31';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact, recentFacts, type Fact } from '../facts17';
import { grantHold, holds17 } from '../holds17';
import { know } from '../know';
import { hasOpinion, opine, opinionOf } from '../opinion';
import { registerDeadline } from '../calendar19';
import { pa18, personActionDefs18, registerPersonAction } from '../personact18';
import { rng19 } from '../rng19';
import { lock31, UNLOCK31, type Lock31 } from '../r31/lock';
import { LOOKH31 } from '../r31/lookhook31';
import { purse } from '../r31/purse31';
import { rolesOf } from '../r31/role';
import { registerEditable, registerRunnable } from '../r31/editor';
import { registerSwitch, setSw, sw } from '../r31/switches';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, playerActs } from '../util';
import { actsNow27 } from '../tickcache27';
import { famOf29 } from './family29';
import { feudOf18, startFeud18 } from './feud18';
import { breakUp, energyLeft, life, playerAct, spendEnergy, startDating, type Partner } from './life';
import { AMOR17, affairRisk17, discoverAffair17, divorce17, endAffair, love17, playerFame, startAffair, type Affair17 } from './love17';
import { ownerOf } from './people/owner';
import { status16 } from './people16';
import { per13 } from './persona13';
import { fameOfKey, realKey18 } from './personact18';
import { acceptance, sexOf } from './sex17';
import { socio31 } from './socio31';
import { addHype } from './hype12';
const hype = (s: GameState, actId: string, v: number, t: L): void => addHype(s, `a:${actId}`, 'amor31', t, v);

// ---------------------------------------------------------------- interruptores

export const SW_ASK31 = 'amor31.ask';
export const SW_AFFAIR31 = 'amor31.affair';
export const SW_MARKET31 = 'amor31.market';
registerSwitch({
  id: SW_ASK31, def: true, scope: 'game',
  desc: l('Amor: chamar qualquer pessoa adulta para sair (pela ficha, menu de pessoa ou cena), com resposta pela conta mostrada antes. Desligado: só o "flertar" antigo e os candidatos sorteados.',
    'Love: ask any adult out (from their card, the person menu or a scene), answered by the odds shown beforehand. Off: only the old "flirt" and the random suitors.'),
});
registerSwitch({
  id: SW_AFFAIR31, def: true, scope: 'game',
  desc: l('Amor: casos com gente do mundo e ser amante de alguém casado; risco de descoberta por quem sabe e pela imprensa da época; descoberta vira trunfo, notícia e pode virar divórcio. Desligado: só o caso antigo com candidatos sorteados.',
    'Love: affairs with people in the world and being the lover of someone married; discovery risk from who knows and the era\'s press; discovery becomes leverage, news and maybe divorce. Off: only the old affair with random suitors.'),
});
registerSwitch({
  id: SW_MARKET31, def: true, scope: 'game',
  desc: l('Amor: romance com gente do mercado (selo rival, crítico, rádio, empresário, sócio, seu elenco) abre informação, gera conflito de interesse e término ruim vira rixa. Desligado: essas pessoas não aceitam sair com você.',
    'Love: romance with market people (rival label, critic, radio, manager, partner, your roster) opens information, creates conflicts of interest and a bad breakup becomes a feud. Off: those people will not go out with you.'),
});
export const askOn31 = (s: GameState): boolean => sw<boolean>(s, SW_ASK31);
export const affairOn31 = (s: GameState): boolean => sw<boolean>(s, SW_AFFAIR31);
export const marketOn31 = (s: GameState): boolean => sw<boolean>(s, SW_MARKET31);

// ---------------------------------------------------------------- estado

export type Tie31 = 'roster' | 'rival' | 'critic' | 'radio' | 'manager' | 'socio';
export interface AmorEsc31 { f: string; w: number; sev: number; t: L }
export interface Amor31St {
  /** chave do par oficial (quando não é uma pessoa de s.persons) e a semana em que começou (casa com partner.since) */
  pk?: string; ps?: number;
  /** chave do(a) amante (idem, casa com affair.since) */
  ak?: string; as?: number;
  /** recusas: chave → semana em que dá para tentar de novo */
  cd: Record<string, number>;
  /** últimas recusas com o motivo (chave, motivo) */
  nos: [string, L][];
  /** quem ficou sabendo do caso atual (chaves) */
  knows: string[];
  /** cuidado com a discrição até a semana */
  care?: number;
  /** boatos que viram notícia na semana `w` */
  esc: AmorEsc31[];
  /** laços de mercado já explorados (uma informação por pessoa) */
  intel: string[];
  /** pedido de ajuda do par com carreira própria */
  req?: { w: number; act: string };
  /** casamento já anunciado (semana do casamento) */
  wed?: number;
  /** última descoberta (cena) */
  last?: { w: number; who: string; partner: string };
  /** aniversários já cobrados (chave `tipo|ano`) */
  ann: string[];
  log: [number, L][];
  n: { asks: number; yes: number; no: number; found: number; feuds: number };
}
declare module '../ext4' { interface Ext4 { amor31: Amor31St } }
const fresh = (): Amor31St => ({ cd: {}, nos: [], knows: [], esc: [], intel: [], ann: [], log: [], n: { asks: 0, yes: 0, no: 0, found: 0, feuds: 0 } });
registerExt4('amor31', fresh);
export function amor31(s: GameState): Amor31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.amor31 ??= fresh()) as Amor31St;
  st.cd ??= {}; st.nos ??= []; st.knows ??= []; st.esc ??= []; st.intel ??= []; st.ann ??= []; st.log ??= []; st.n ??= { asks: 0, yes: 0, no: 0, found: 0, feuds: 0 };
  return st;
}
/** Leitura sem criar o estado (interface, testes de "explorar não muda"). */
const peek = (s: GameState): Partial<Amor31St> => ((s as unknown as { x4?: { amor31?: Amor31St } }).x4?.amor31 ?? {});
const log31 = (s: GameState, t: L): void => { const L0 = amor31(s).log; L0.unshift([s.year, t]); if (L0.length > 30) L0.length = 30; };

// ---------------------------------------------------------------- família Fossati: nunca

const FAM_NAMES31 = new Set(FAMILY31.map((m) => m.name));
/** A ÚNICA trava da família Fossati (Efro, Lucia, Sonia, Antonella e Gianluca): nenhum romance, caso, flerte ou pedido,
 *  por nenhuma porta. Aceita a chave da ficha ('fam:lucia'), o id curto ('lucia') ou uma pessoa com o nome da família. */
export function romanceLock31(s: GameState, key: string): Lock31 | null {
  const id = key.replace(/^p:/, '');
  const hit = famById31(id) ?? famById31(key) ?? (s.persons[id] && FAM_NAMES31.has(s.persons[id].name) ? FAMILY31.find((m) => m.name === s.persons[id].name) : undefined);
  if (!hit) return null;
  return lock31(fmtL(l('{n} é da família Fossati: fica fora de qualquer romance no jogo (homenagem).', '{n} is part of the Fossati family: kept out of any romance in the game (a tribute).'), { n: hit.name }),
    l('Não libera: a família é homenagem. Almoço de domingo, sim; romance, não.', 'Never unlocks: the family is a tribute. Sunday lunch, yes; romance, no.'));
}
export const isFossati31 = (s: GameState, key: string): boolean => !!romanceLock31(s, key);
void famKey31;

// ---------------------------------------------------------------- quem é a pessoa

const pidOf = (key: string): string | undefined => (key.startsWith('p:') ? key.slice(2) : undefined);
const norm = (s: GameState, key: string): string => (key.startsWith('p:') || key.includes(':') ? key : s.persons[key] ? `p:${key}` : key);
const PERSONLIKE = ['p', 'l', 'c', 'e', 'pd'];
export const nameOf31 = (s: GameState, key: string): string => { const id = pidOf(key); return id ? s.persons[id]?.name ?? key : per13(s, key)?.name ?? key; };
const bornOf = (s: GameState, key: string): number | undefined => { const id = pidOf(key); return id ? s.persons[id]?.born : per13(s, key)?.born; };
const actOfP = (s: GameState, pid: string): Act | undefined => actsNow27(s).find((a) => a.members.includes(pid) && a.status !== 'retired' && a.status !== 'split');
const mine = (s: GameState, a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const meKey = (s: GameState): string => { const id = ownerOf(s).personId; return id ? `p:${id}` : 'player'; };

/** Laço de mercado da pessoa com você (o que vira conflito de interesse). */
export function tieOf31(s: GameState, key0: string): Tie31 | null {
  const key = norm(s, key0);
  for (const b of Object.values(socio31(s).b)) if (b.me > 0 && b.p.some((p) => p.k === key)) return 'socio';
  if (key.startsWith('l:')) return 'rival';
  if (key.startsWith('c:')) return 'critic';
  if (key.startsWith('e:')) return 'manager';
  const id = pidOf(key);
  if (!id) return null;
  const a = actOfP(s, id);
  if (mine(s, a)) return 'roster';
  const rs = rolesOf(s, id, s.year).map((r) => r.kind);
  if (rs.includes('critic')) return 'critic';
  if (rs.includes('dj') || rs.includes('media')) return 'radio';
  if (rs.includes('manager')) return 'manager';
  if (rs.includes('owner') || rs.includes('exec') || rs.includes('leader')) return 'rival';
  return null;
}
export const TIE31: Record<Tie31, L> = {
  roster: l('artista do seu elenco', 'an act on your roster'), rival: l('gente de selo rival', 'rival label people'), critic: l('crítico(a)', 'a critic'),
  radio: l('rádio e mídia', 'radio and media'), manager: l('empresário(a)', 'a manager'), socio: l('seu sócio ou sócia', 'your business partner'),
};

/** Estado civil da pessoa (do mundo) com outra pessoa que não é você. */
export function marriedOther31(s: GameState, key0: string): boolean {
  const key = norm(s, key0);
  const id = pidOf(key);
  const pt = life(s).partner;
  if (id) {
    if (pt?.personId === id) return false;
    const f = famOf29(s, id);
    if (f.partner?.married && f.partner.pid !== ownerOf(s).personId) return true;
    const F = s.families[id];
    return !!F?.partner && !F.separated;
  }
  // líderes, críticos, empresários: estado civil pela ficha (mesma conta para sempre nesta partida)
  return (hashString(`${s.config.seed}|amor31|mar|${key}`) % 100) < 38 && (s.year - (bornOf(s, key) ?? s.year - 40)) >= 28;
}

type Sex = 'm' | 'f' | 'x';
const mySex = (s: GameState): Sex => (per13(s, 'player')?.sex ?? 'x') as Sex;
const sexOfKey = (s: GameState, key: string): Sex => (per13(s, key)?.sex ?? 'x') as Sex;
/** Orientação de quem não é integrante (líder, crítico…): a mesma distribuição do sex17, pela ficha. */
function orientOf(s: GameState, key: string): 'het' | 'gay' | 'bi' | 'ace' {
  const id = pidOf(key);
  if (id) { const o = sexOf(s, id).o; return o === 'private' ? 'het' : o; }
  const u = (hashString(`${s.config.seed}:sx17:o:${key}`) % 10000) / 10000;
  return u < 0.905 ? 'het' : u < 0.94 ? 'gay' : u < 0.99 ? 'bi' : 'ace';
}
/** A pessoa sente atração por alguém do seu sexo? (consentimento: não é regra moral, é dela) */
function attraction(s: GameState, key: string): number {
  const o = orientOf(s, key);
  const me = mySex(s), them = sexOfKey(s, key);
  if (o === 'bi') return 0;
  if (o === 'ace') return -0.25;
  if (me === 'x' || them === 'x') return o === 'het' ? -0.15 : 0;
  const same = me === them;
  return (o === 'gay') === same ? 0 : -0.7;
}

// ---------------------------------------------------------------- chance (pura) e trava

export interface AskOdds31 { p: number; why: [L, number][]; mode: 'date' | 'affair' | 'lover' }
const pctS = (v: number): string => `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v * 100))}%`;
const fac = (s: GameState, key: string, f: string): number => (per13(s, key)?.facets as Record<string, number> | undefined)?.[f] ?? 50;

/** Modo do pedido: namoro, caso (você comprometido) ou você como amante (a pessoa é casada). */
export function askMode31(s: GameState, key: string): 'date' | 'affair' | 'lover' {
  if (life(s).partner) return 'affair';
  return marriedOther31(s, key) ? 'lover' : 'date';
}

/** Chance de a pessoa aceitar e o porquê (cada fator com o peso). Só lê. */
export function askOdds31(s: GameState, key0: string): AskOdds31 {
  const key = norm(s, key0);
  const why: [L, number][] = [];
  const add = (t: L, v: number) => { if (Math.abs(v) >= 0.005) why.push([t, v]); };
  const id = pidOf(key);
  const nm = nameOf31(s, key);
  // conhecimento
  if (id) { const k = know(s, id).priv; add(k >= 2 ? l('Vocês se conhecem bem', 'You know each other well') : k >= 1 ? l('Vocês já se viram', 'You have met') : l('Mal se conhecem', 'You barely know each other'), k * 0.03 - 0.05); }
  else add(hasOpinion(s, key) ? l('Vocês já se conhecem', 'You already know each other') : l('Mal se conhecem', 'You barely know each other'), hasOpinion(s, key) ? 0.04 : -0.05);
  // opinião
  const op = opinionOf(s, key);
  add(op >= 0 ? l('O que pensa de você (opinião boa)', 'What they think of you (good opinion)') : l('O que pensa de você (opinião ruim)', 'What they think of you (bad opinion)'), clamp(op / 220, -0.35, 0.3));
  // química (fixa para o par nesta partida) e charme
  const chem = ((hashString(`${s.config.seed}|amor31|chem|${key}|${meKey(s)}`) % 1000) / 1000 - 0.5) * 0.3;
  add(chem >= 0 ? l('Química entre vocês', 'Chemistry between you') : l('Pouca química', 'Little chemistry'), chem);
  const o = ownerOf(s);
  add(l('Seu charme (carisma e aparência)', 'Your charm (charisma and looks)'), (o.attrs.charisma - 50) / 220 + (LOOKH31.date?.(s) ?? 0) / 100);
  // atração (orientação da pessoa)
  const at = attraction(s, key);
  add(at <= -0.5 ? l('Não sente atração por você (orientação)', 'Not attracted to you (orientation)') : l('Pouca atração (orientação da pessoa)', 'Little attraction (their orientation)'), at);
  // idade
  const b = bornOf(s, key);
  if (b !== undefined) { const gap = Math.abs(b - o.born); if (gap > 6) add(fmtL(l('Diferença de idade ({n} anos)', 'Age gap ({n} years)'), { n: gap }), -Math.min(0.35, (gap - 6) / 45)); }
  // estado civil
  if (marriedOther31(s, key)) add(fmtL(l('{n} é casado(a)', '{n} is married'), { n: nm }), -0.16 + (fac(s, key, 'impulsividade') - 50) / 260 - (fac(s, key, 'lealdade') - 50) / 220);
  if (life(s).partner) add(playerFame(s) >= 25 ? l('Você é comprometido(a) — e todo mundo sabe', 'You are taken — and everyone knows') : l('Você é comprometido(a)', 'You are taken'), playerFame(s) >= 25 ? -0.12 : -0.06);
  // fama relativa
  const tf = fameOfKey(s, key), pf = playerFame(s);
  add(tf > pf + 15 ? fmtL(l('{n} é bem mais famoso(a) que você', '{n} is much more famous than you'), { n: nm }) : pf > tf + 15 ? l('Sua fama impressiona', 'Your fame impresses') : l('Fama parecida', 'Similar fame'), clamp((pf - tf) / 160, -0.25, 0.12));
  // traços
  add(l('Romantismo', 'Romanticism'), (fac(s, key, 'romantismo') - 50) / 200);
  add(l('Sociabilidade', 'Sociability'), (fac(s, key, 'sociabilidade') - 50) / 400);
  // laços com você
  const tie = tieOf31(s, key);
  if (tie === 'roster') { add(l('Vocês convivem no selo', 'You work together at the label'), 0.05); add(l('Você é o(a) patrão(oa): poder desigual', 'You are the boss: unequal power'), -0.11); }
  if (tie === 'socio') add(l('Sócios: convivência e negócio misturados', 'Partners: business and closeness mixed'), 0.02);
  if (tie === 'critic') add(l('Crítico(a) teme pela credibilidade', 'A critic fears for their credibility'), -0.06);
  if (rivalOf(s, key)) add(l('Rivalidade entre vocês', 'Rivalry between you'), -0.16);
  // ex (de você): mágoa ou saudade
  const ex = love17(s).exes.find((e) => e.name === nm);
  if (ex) add(ex.bitter ? l('Ex ressentido(a)', 'A bitter ex') : l('Ex: ainda há afeto', 'An ex: there is still affection'), ex.bitter ? -0.2 : (ex.aff - 40) / 300);
  const p = clamp(0.32 + why.reduce((t, [, v]) => t + v, 0), 0.02, 0.9);
  return { p, why, mode: askMode31(s, key) };
}
function rivalOf(s: GameState, key: string): boolean {
  if (key.startsWith('l:') && opinionOf(s, key) <= -25) return true;
  const id = pidOf(key);
  if (!id) return false;
  const a = actOfP(s, id);
  if (!a) return false;
  return playerActs(s).some((m) => !!feudOf18(s, m, a.id));
}

const PERSON_COST31 = 100;
/** Trava do pedido (motivo + condição) ou null. Só lê. */
export function askLock31(s: GameState, key0: string): Lock31 | null {
  const key = norm(s, key0);
  const fos = romanceLock31(s, key);
  if (fos) return fos;
  if (!askOn31(s)) return lock31(l('Chamar qualquer pessoa para sair está desligado nesta partida.', 'Asking anyone out is switched off in this game.'), l('Ligue "Amor: chamar qualquer pessoa" no Editor › Interruptores.', 'Turn on "Love: ask anyone out" in Editor › Switches.'));
  if (s.config.contentFilters.includes('romance')) return lock31(l('Romance está filtrado nas opções de conteúdo.', 'Romance is filtered in the content options.'), l('Tire o filtro "romance" nas Opções.', 'Remove the "romance" filter in Options.'));
  const kc = key.split(':')[0];
  if (!PERSONLIKE.includes(kc)) return lock31(l('Só dá para chamar uma pessoa para sair.', 'You can only ask a person out.'), UNLOCK31.generic);
  const id = pidOf(key);
  const p: Person | undefined = id ? s.persons[id] : undefined;
  if (id && !p) return lock31(l('Pessoa não encontrada.', 'Person not found.'), UNLOCK31.generic);
  if (p?.isPlayer || key === meKey(s)) return lock31(l('Esse(a) é você.', 'That is you.'), UNLOCK31.generic);
  if (!per13(s, key)) return lock31(l('Pessoa não encontrada.', 'Person not found.'), UNLOCK31.generic);
  if ((p && !p.alive) || status16(s, key) === 'dead') return lock31(l('Essa pessoa já morreu.', 'This person has died.'), UNLOCK31.ended);
  const b = bornOf(s, key);
  if (b !== undefined && s.year - b < 18) return lock31(l('Menor de idade: fora de qualquer romance.', 'A minor: out of any romance.'), l('Não libera para menores.', 'Never for minors.'));
  if (s.config.history === 'strict' && realKey18(s, key)) return lock31(l('Vida real exata: pessoa real só vive fatos documentados.', 'Exact real life: a real person only lives documented facts.'), l('Mude o modo de história para "alternativa" na criação da partida.', 'Pick "alternate" history when creating the game.'));
  const L0 = life(s), L7 = love17(s);
  const pk = partnerKey31(s), ak = affairKey31(s);
  if (pk === key) return lock31(fmtL(l('{n} já é seu par.', '{n} is already your partner.'), { n: nameOf31(s, key) }), UNLOCK31.owned);
  if (ak === key) return lock31(fmtL(l('Vocês já têm um caso.', 'You are already having an affair.'), {}), UNLOCK31.owned);
  const mode = askMode31(s, key);
  if ((mode === 'affair' || mode === 'lover') && !affairOn31(s)) return lock31(mode === 'affair' ? fmtL(l('Você namora {p}; casos estão desligados nesta partida.', 'You are with {p}; affairs are switched off in this game.'), { p: L0.partner!.name }) : fmtL(l('{n} é casado(a) e casos estão desligados nesta partida.', '{n} is married and affairs are switched off in this game.'), { n: nameOf31(s, key) }),
    l('Ligue "Amor: casos" no Editor › Interruptores (ou termine o relacionamento atual).', 'Turn on "Love: affairs" in Editor › Switches (or end your current relationship).'));
  if (mode === 'affair' && L7.affair) return lock31(fmtL(l('Você já tem um caso com {c}.', 'You already have an affair with {c}.'), { c: L7.affair.name }), l('Termine o caso atual (aba Você › Coração).', 'End the current affair (You › Heart).'));
  if (tieOf31(s, key) && !marketOn31(s)) return lock31(fmtL(l('{n} é {t}: romance com gente do mercado está desligado nesta partida.', '{n} is {t}: romance with market people is switched off in this game.'), { n: nameOf31(s, key), t: TIE31[tieOf31(s, key)!] }), l('Ligue "Amor: mercado" no Editor › Interruptores.', 'Turn on "Love: market" in Editor › Switches.'));
  const cd = peek(s).cd?.[key];
  if (cd !== undefined && cd > s.week) return lock31(fmtL(l('{n} disse não há pouco; insistir agora pesa.', '{n} said no recently; insisting now would backfire.'), { n: nameOf31(s, key) }), fmtL(l('Espere mais {w} semana(s).', 'Wait {w} more week(s).'), { w: cd - s.week }));
  if (energyLeft(s) < 1) return lock31(l('Sem tempo livre este mês.', 'No free time left this month.'), UNLOCK31.time);
  if (ownerOf(s).wealth < money(s, PERSON_COST31)) return lock31(l('Patrimônio pessoal insuficiente para o programa (sai do seu bolso).', 'Not enough personal wealth for the outing (it comes out of your pocket).'), l('Junte dinheiro pessoal: retire do selo (aba Você › Patrimônio) ou venda algo seu.', 'Raise personal money: draw from the label (You › Wealth) or sell something of yours.'));
  return null;
}

/** Motivo da última recusa desta pessoa (enquanto não dá para pedir de novo). Só lê. */
export function lastNo31(s: GameState, key0: string): L | null {
  const key = norm(s, key0);
  const st = peek(s);
  if ((st.cd?.[key] ?? 0) <= s.week) return null;
  return st.nos?.find(([k]) => k === key)?.[1] ?? null;
}

/** O que a resposta vai ser (determinístico: semente + pessoa + mês). Só lê. */
export function askRoll31(s: GameState, key0: string): number {
  const key = norm(s, key0);
  return Rng.fromSeed(`${s.config.seed}|amor31|ask|${key}|${meKey(s)}|${s.year}|${s.month}`).next();
}

// ---------------------------------------------------------------- chaves do par e do(a) amante

export function partnerKey31(s: GameState): string | undefined {
  const pt = life(s).partner;
  if (!pt) return undefined;
  if (pt.personId) return `p:${pt.personId}`;
  const st = peek(s);
  return st.pk && st.ps === pt.since ? st.pk : undefined;
}
export function affairKey31(s: GameState): string | undefined {
  const a = love17(s).affair;
  if (!a) return undefined;
  if (a.pid) return `p:${a.pid}`;
  const st = peek(s);
  return st.ak && st.as === a.since ? st.ak : undefined;
}

function jobOf(s: GameState, key: string): L {
  const tie = tieOf31(s, key);
  if (tie) return TIE31[tie];
  const id = pidOf(key);
  const a = id ? actOfP(s, id) : undefined;
  return a ? fmtL(l('artista ({a})', 'artist ({a})'), { a: a.name }) : key.startsWith('pd:') ? l('produtor(a)', 'producer') : l('gente do meio', 'industry person');
}

// ---------------------------------------------------------------- pedir

export interface AskRes31 { ok: boolean; text: L; why?: L; mode?: 'date' | 'affair' | 'lover' }
/** Chama a pessoa para sair. Gasta 1 tempo livre e o programa (bolso). A resposta é a conta mostrada antes. */
export function askOut31(s: GameState, key0: string): AskRes31 {
  const key = norm(s, key0);
  const lk = askLock31(s, key);
  if (lk) return { ok: false, text: lk.why, why: lk.why };
  const st = amor31(s);
  const e = spendEnergy(s, 1);
  if (e) return { ok: false, text: e };
  purse(s, -money(s, PERSON_COST31), 'leisure', 'amor31:ask', { who: ownerOf(s) });
  const odds = askOdds31(s, key);
  const nm = nameOf31(s, key);
  st.n.asks++;
  if (askRoll31(s, key) >= odds.p) {
    st.n.no++;
    st.cd[key] = s.week + 26;
    opine(s, key, -2, l('me chamou para sair e eu não quis.', 'asked me out and I said no.'));
    const worst = [...odds.why].sort((a, b) => a[1] - b[1])[0];
    const why = worst && worst[1] < 0 ? worst[0] : l('Não rolou química desta vez.', 'There was no spark this time.');
    const text = fmtL(l('{n} recusou. Motivo: {w}.', '{n} said no. Reason: {w}.'), { n: nm, w: why });
    st.nos = [[key, why] as [string, L], ...st.nos.filter(([k]) => k !== key)].slice(0, 20);
    log31(s, text);
    return { ok: false, text, why, mode: odds.mode };
  }
  // aceitou: namoro, caso ou você como amante (as funções antigas fazem o resto)
  const L0 = life(s);
  const id = pidOf(key);
  const cid = `c${s.week}-am${st.n.asks}`;
  const b = bornOf(s, key) ?? s.year - 35;
  L0.candidates = [{ id: cid, name: nm, born: b, job: jobOf(s, key), trait: 'artsy', chemistry: Math.round(clamp(40 + odds.p * 60, 30, 95)), personId: id }, ...L0.candidates].slice(0, 4);
  const mode = odds.mode;
  const err = mode === 'affair' ? startAffair(s, cid) : startDating(s, cid);
  if (err) return { ok: false, text: err };
  st.n.yes++;
  if (mode === 'affair') { if (!id) { st.ak = key; st.as = love17(s).affair?.since; } st.knows = []; }
  else { st.pk = key; st.ps = life(s).partner?.since; }
  opine(s, key, 10, mode === 'date' ? l('estamos namorando.', 'we\'re dating.') : l('estamos nos vendo em segredo.', 'we\'re seeing each other in secret.'));
  const text = mode === 'date' ? fmtL(l('{n} topou! Vocês começaram a namorar.', '{n} said yes! You started dating.'), { n: nm })
    : mode === 'lover' ? fmtL(l('{n} topou — mas é casado(a): você é o(a) amante. Discrição é tudo.', '{n} said yes — but is married: you are the lover. Discretion is everything.'), { n: nm })
      : fmtL(l('{n} topou. Vocês começaram um caso: discrição é tudo agora.', '{n} said yes. You began an affair: discretion is everything now.'), { n: nm });
  const tie = tieOf31(s, key);
  if (tie && marketOn31(s)) notify(s, fmtL(l('{n} é {t}: abre portas e informação — e conflito de interesse se vier a público.', '{n} is {t}: it opens doors and information — and a conflict of interest if it goes public.'), { n: nm, t: TIE31[tie] }), 'info');
  log31(s, text);
  return { ok: true, text, mode };
}

// ---------------------------------------------------------------- discrição, perdão, fim

/** Cuidar da discrição por 3 meses: 1 tempo livre e um apartamento discreto (bolso). Reduz o risco do mês. */
export function careLock31(s: GameState): Lock31 | null {
  if (!love17(s).affair && !love17(s).pm) return lock31(l('Não há segredo para guardar.', 'There is no secret to keep.'), UNLOCK31.generic);
  if ((peek(s).care ?? 0) > s.week) return lock31(l('A discrição já está cuidada.', 'Discretion is already taken care of.'), fmtL(l('Vale até daqui a {w} semana(s).', 'Lasts {w} more week(s).'), { w: (peek(s).care ?? 0) - s.week }));
  if (energyLeft(s) < 1) return lock31(l('Sem tempo livre este mês.', 'No free time left this month.'), UNLOCK31.time);
  if (ownerOf(s).wealth < money(s, 800)) return lock31(l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.'), UNLOCK31.cash);
  return null;
}
export function takeCare31(s: GameState): AskRes31 {
  const lk = careLock31(s);
  if (lk) return { ok: false, text: lk.why };
  const e = spendEnergy(s, 1);
  if (e) return { ok: false, text: e };
  purse(s, -money(s, 800), 'family', 'amor31:care', { who: ownerOf(s) });
  amor31(s).care = s.week + 13;
  const a = love17(s).affair;
  if (a) a.disc = clamp(a.disc + 8, 0, 95);
  return { ok: true, text: l('Encontros em lugar discreto, telefone com código, nada de fotos: o risco cai pelos próximos três meses.', 'Meetings somewhere discreet, coded phone calls, no photos: the risk drops for the next three months.') };
}

/** Depois da descoberta: pedir perdão ao par (determinístico pela semente e semana). */
export function forgiveOdds31(s: GameState): { p: number; why: [L, number][] } {
  const pt = life(s).partner;
  const why: [L, number][] = [];
  if (!pt) return { p: 0, why };
  why.push([l('Afinidade que sobrou', 'Affinity left'), (pt.affinity - 30) / 120]);
  if (pt.trait === 'homebody') why.push([l('Par caseiro(a): leva para o coração', 'A homebody: takes it to heart'), -0.1]);
  if (pt.stage === 'married') why.push([l('Casamento: muito a perder', 'Marriage: a lot to lose'), 0.08]);
  why.push([l('Moral da época e do país', 'Morals of the era and country'), -(moral31(s) - 1) * 0.25]);
  return { p: clamp(0.35 + why.reduce((t, [, v]) => t + v, 0), 0.05, 0.85), why };
}
export function askForgive31(s: GameState): AskRes31 {
  const pt = life(s).partner;
  const st = amor31(s);
  if (!pt || !st.last || st.last.w < s.week - 12) return { ok: false, text: l('Não há o que pedir agora.', 'Nothing to ask for now.') };
  const e = spendEnergy(s, 1);
  if (e) return { ok: false, text: e };
  const o = forgiveOdds31(s);
  st.last = undefined;
  if (Rng.fromSeed(`${s.config.seed}|amor31|forgive|${s.week}`).next() < o.p) {
    pt.affinity = clamp(pt.affinity + 18, 0, 100);
    love17(s).jeal = clamp(love17(s).jeal - 20, 0, 100);
    return { ok: true, text: fmtL(l('{p} aceitou tentar de novo. Vai levar tempo.', '{p} agreed to try again. It will take time.'), { p: pt.name }) };
  }
  pt.affinity = clamp(pt.affinity - 8, 0, 100);
  return { ok: false, text: fmtL(l('{p} não perdoou. Por enquanto.', '{p} did not forgive you. For now.'), { p: pt.name }) };
}

// ---------------------------------------------------------------- moral da época e do país

/** Peso da moral pública (1 = neutro): divórcio e caso eram mal vistos antes de ~1970; casal do mesmo sexo pesa pela
 *  aceitação do país na época — só como reação do mundo, nunca como trava. */
export function moral31(s: GameState, sameSex = false): number {
  const y = s.year;
  let m = y < 1920 ? 1.6 : y < 1970 ? 1.4 : y < 1990 ? 1.0 : y < 2010 ? 0.85 : 0.75;
  if (sameSex) m *= 1 + (1 - acceptance(countryOfCity(s.config.homeCity), y, s.config.homeCity)) * 0.6;
  return m;
}
/** Imprensa da época: colunas sociais → tabloides → paparazzi → redes. */
export function pressEra31(y: number): { k: number; name: L } {
  if (y < 1920) return { k: -0.01, name: l('jornais discretos e cartas', 'discreet papers and letters') };
  if (y < 1950) return { k: 0, name: l('colunas sociais', 'society columns') };
  if (y < 1980) return { k: 0.006, name: l('revistas de fofoca', 'gossip magazines') };
  if (y < 2005) return { k: 0.012, name: l('paparazzi', 'paparazzi') };
  return { k: 0.02, name: l('celulares e redes sociais', 'phones and social media') };
}

/** Quem sabe do seu caso (além de você e do/a amante): chaves dos que guardam o segredo. */
export function whoKnows31(s: GameState): { key: string; name: string; gossip: boolean }[] {
  const out = new Map<string, { key: string; name: string; gossip: boolean }>();
  const ak = affairKey31(s);
  for (const k of peek(s).knows ?? []) if (k !== ak) out.set(k, { key: k, name: nameOf31(s, k), gossip: fac(s, k, 'sociabilidade') > 64 });
  for (const h of holds17(s).h) if (h.status === 'open' && h.target === 'player' && (h.src === 'love17' || h.src === 'amor31') && h.kind === 'secret') {
    const k = s.persons[h.holder] ? `p:${h.holder}` : h.holder;
    if (k === ak || k.startsWith('lover:') || out.has(k)) continue;
    out.set(k, { key: k, name: k === 'press' ? l('A imprensa', 'The press').pt : nameOf31(s, k), gossip: k === 'press' || fac(s, k, 'sociabilidade') > 64 });
  }
  return [...out.values()];
}

/** Partes do risco que o amor31 soma ao do love17 (interface mostra cada uma). */
export function riskParts31(s: GameState): [L, number][] {
  const out: [L, number][] = [];
  if (!affairOn31(s) || !love17(s).affair) return out;
  const ks = whoKnows31(s);
  if (ks.length) out.push([fmtL(ks.length === 1 ? l('{n} pessoa sabe', '{n} person knows') : l('{n} pessoas sabem', '{n} people know'), { n: ks.length }), ks.length * 0.008]);
  const g = ks.filter((x) => x.gossip).length;
  if (g) out.push([fmtL(g === 1 ? l('{n} fofoqueiro entre elas', '{n} gossip among them') : l('{n} fofoqueiros entre elas', '{n} gossips among them'), { n: g }), g * 0.01]);
  const pe = pressEra31(s.year);
  const pf = playerFame(s);
  if (pf >= 15) out.push([fmtL(l('Imprensa da época: {p}', 'The era\'s press: {p}'), { p: pe.name }), pe.k * (0.5 + pf / 60)]);
  if ((peek(s).care ?? 0) > s.week) out.push([l('Discrição cuidada', 'Discretion taken care of'), -0.025]);
  const a = love17(s).affair!;
  if (a.pid && tieOf31(s, `p:${a.pid}`) === 'roster') out.push([l('Amante no seu elenco: todo mundo vê', 'Lover on your roster: everyone sees'), 0.012]);
  return out;
}
AMOR17.risk = (s) => riskParts31(s).reduce((t, [, v]) => t + v, 0);
AMOR17.pm = (s, pt) => {
  if (!affairOn31(s)) return undefined;
  if (pt.personId) return marriedOther31(s, `p:${pt.personId}`);
  const st = peek(s);
  return st.pk && st.ps === pt.since ? marriedOther31(s, st.pk) : undefined;
};
export const affairRisk31 = (s: GameState): number => affairRisk17(s);

// ---------------------------------------------------------------- descoberta (fato do love17)

onFact('affair', (s, f) => {
  if (!affairOn31(s) || f.src !== 'love17' || !f.actors.includes('player') || !f.tags.includes('exposed')) return;
  onDiscovered31(s, f);
}, 'amor31:found');

function onDiscovered31(s: GameState, f: Fact): void {
  const st = amor31(s);
  st.n.found++;
  const pt = life(s).partner;
  const lover = f.actors.find((x) => x !== 'player');
  st.last = { w: s.week, who: lover ? nameOf31(s, `p:${lover}`) : (st.ak ? nameOf31(s, st.ak) : '?'), partner: pt?.name ?? '?' };
  const m = moral31(s, !!love17(s).affair?.ss);
  // a imprensa fica com o trunfo (chantagem possível) e o boato escala para notícia
  if (f.visibility !== 'secret') {
    grantHold(s, { holder: 'press', target: 'player', kind: 'secret', strength: Math.round(45 + f.severity / 2), months: 24, proof: 1, factId: f.id, src: 'amor31', text: fmtL(l('A imprensa tem provas do caso de {o}', 'The press has proof of {o}\'s affair'), { o: ownerOf(s).name }) });
    st.esc.push({ f: f.id, w: s.week + 3 + (hashString(`${s.config.seed}|amor31|esc|${f.id}`) % 5), sev: Math.round(f.severity * m), t: f.text });
  } else {
    // quem descobriu (o par) guarda a mágoa como trunfo
    grantHold(s, { holder: pt?.personId ?? `partner:${pt?.name ?? '?'}`, target: 'player', kind: 'grievance', strength: 55, months: 60, factId: f.id, src: 'amor31', text: l('Descobriu a traição', 'Found out about the affair') });
  }
  // opinião: par (se é do mundo), família do par, sócios
  const pk = partnerKey31(s);
  if (pk) opine(s, pk, Math.round(-30 * m), l('me traiu.', 'cheated on me.'));
  if (pt?.personId) for (const k of famOf29(s, pt.personId).kids) if (k.pid) opine(s, `p:${k.pid}`, Math.round(-10 * m), l('traiu quem a gente ama.', 'cheated on someone we love.'));
  for (const b of Object.values(socio31(s).b)) if (b.me > 0) for (const p of b.p) opine(s, p.k, Math.round(-4 * m), l('vida pessoal virou problema da sociedade.', 'personal life became the partnership\'s problem.'));
  // o par casado pode pedir o divórcio na justiça (partilha do bolso do dono)
  if (pt?.stage === 'married' && pt.affinity < 35 && Rng.fromSeed(`${s.config.seed}|amor31|div|${f.id}`).next() < clamp(0.35 * m, 0.1, 0.8)) {
    const name = pt.name;
    const e = divorce17(s, 'court', rng19(s, 'amor31'));
    if (!e) notify(s, fmtL(l('{p} pediu o divórcio na justiça depois da traição.', '{p} filed for divorce after the affair.'), { p: name }), 'bad');
  }
  log31(s, f.text);
}

// ---------------------------------------------------------------- mês

registerSimHook('month', 'amor31', (s) => {
  const st0 = peek(s);
  const L0 = life(s), L7 = love17(s);
  const busy = !!L0.partner || !!L7.affair || !!st0.esc?.length || !!st0.req;
  if (!busy) return;
  const st = amor31(s);
  const r = Rng.fromSeed(`${s.config.seed}|amor31|m|${s.year}|${s.month}`);
  const pk = partnerKey31(s), ak = affairKey31(s);
  // boatos que viram notícia
  if (st.esc.length) {
    const due = st.esc.filter((x) => x.w <= s.week);
    st.esc = st.esc.filter((x) => x.w > s.week);
    for (const x of due) {
      const fame = playerFame(s);
      if (fame < 15 && !x.t) continue;
      emitFact(s, { kind: 'affair', actors: ['player'], place: s.config.homeCity, severity: clamp(x.sev, 20, 80), visibility: 'public', tags: ['sex', 'romance', 'bad', 'news'], cause: [x.f],
        text: fmtL(l('Vira notícia: o caso de {o} sai nos jornais.', 'It becomes news: {o}\'s affair hits the papers.'), { o: ownerOf(s).name }), src: 'amor31' });
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - Math.round(2 * moral31(s)), 0, 100);
      if (fame >= 30) s.player.reputation.commercial = clamp(s.player.reputation.commercial - Math.round(moral31(s)), 0, 100);
    }
  }
  if (affairOn31(s) && L7.affair) {
    // quem fica sabendo: gente próxima do(a) amante
    const close = closeTo31(s, ak);
    if (close.length && r.chance(0.08 + (L7.affair.disc < 40 ? 0.05 : 0) - ((st.care ?? 0) > s.week ? 0.05 : 0))) {
      const k = r.pick(close);
      if (!st.knows.includes(k)) {
        st.knows.push(k);
        const holder = k.startsWith('p:') ? k.slice(2) : k;
        grantHold(s, { holder, target: 'player', kind: 'secret', strength: 45, months: 60, proof: 0, src: 'amor31', text: fmtL(l('Sabe do caso de {o} com {c}', 'Knows about {o}\'s affair with {c}'), { o: ownerOf(s).name, c: L7.affair.name }) });
        log31(s, fmtL(l('{n} ficou sabendo do seu caso.', '{n} found out about your affair.'), { n: nameOf31(s, k) }));
      }
    }
    // consentimento: o(a) amante pode terminar
    if (ak && (opinionOf(s, ak) < -10 || ((s.week - L7.affair.since) > 52 && r.chance(0.04)))) {
      const nm = L7.affair.name;
      L7.affair = undefined; L7.past++;
      st.knows = [];
      const t = fmtL(l('{c} terminou o caso: "não dá mais para viver escondido(a)".', '{c} ended the affair: "I can\'t keep hiding anymore".'), { c: nm });
      notify(s, t, 'info'); log31(s, t);
      afterEnd31(s, ak, false);
    }
  } else st.knows = [];
  // romance com o mercado: informação (uma vez por pessoa) e conflito de interesse
  if (marketOn31(s)) for (const k of [pk, ak]) {
    if (!k) continue;
    const tie = tieOf31(s, k);
    if (!tie) continue;
    if (!st.intel.includes(k) && r.chance(0.25)) { st.intel.push(k); intel31(s, k); }
    if (tie === 'socio') for (const b of Object.values(socio31(s).b)) if (b.p.some((p) => p.k === k)) for (const p of b.p) if (p.k !== k) opine(s, p.k, -1, l('o sócio mistura cama e negócio.', 'the partner mixes bed and business.'));
    if (tie === 'roster') { const a = actOfP(s, k.slice(2)); if (a) for (const m of a.members) if (`p:${m}` !== k && s.persons[m]?.alive) { opine(s, `p:${m}`, -1, l('o dono do selo só tem olhos para um de nós.', 'the label owner only has eyes for one of us.')); const q = s.persons[m]; q.stress = clamp(q.stress + 1, 0, 100); } }
  }
  // casal de artistas: fama somada (só o namoro/casamento público)
  if (marketOn31(s) && pk?.startsWith('p:') && L0.partner && L0.partner.affinity >= 40) {
    const a = actOfP(s, pk.slice(2));
    const me = playerAct(s);
    if (a && (me || playerFame(s) >= 20)) { hype(s, a.id, 1, l('Casal famoso', 'Famous couple')); if (me) hype(s, me.id, 1, l('Casal famoso', 'Famous couple')); }
  }
  // casamento como evento de mídia
  const pt = L0.partner;
  if (pt?.stage === 'married' && (st.wed === undefined || st.wed < pt.since)) {
    st.wed = s.week;
    const fame = Math.max(playerFame(s), pk ? fameOfKey(s, pk) : 0);
    if (fame >= 20) {
      const big = fame >= 50;
      emitFact(s, { kind: 'marriage', actors: ['player', ...(pk?.startsWith('p:') ? [pk.slice(2)] : [])], place: s.config.homeCity, severity: Math.round(20 + fame / 3), visibility: 'public', tags: ['romance', 'good', 'wedding', 'media'],
        text: fmtL(big ? l('Casamento de {o} e {p} é capa de revista e passa na TV.', '{o} and {p}\'s wedding makes magazine covers and TV.') : l('Colunas sociais noticiam o casamento de {o} e {p}.', 'Society columns report {o} and {p}\'s wedding.'), { o: ownerOf(s).name, p: pt.name }), src: 'amor31' });
      const me = playerAct(s);
      if (me) hype(s, me.id, big ? 6 : 3, l('Casamento na mídia', 'Wedding in the media'));
      if (pk?.startsWith('p:')) { const a = actOfP(s, pk.slice(2)); if (a) hype(s, a.id, big ? 6 : 3, l('Casamento na mídia', 'Wedding in the media')); }
    }
  }
  // o par com carreira própria pede ajuda
  if (st.req && st.req.w < s.week - 8) { if (pt) pt.affinity = clamp(pt.affinity - 4, 0, 100); st.req = undefined; }
  if (!st.req && pt && pk?.startsWith('p:')) {
    const a = actOfP(s, pk.slice(2));
    if (a && !mine(s, a) && r.chance(0.04)) { st.req = { w: s.week, act: a.id }; notify(s, fmtL(l('{p} pede uma força para a carreira de {a} (aba Você › Coração).', '{p} asks for a hand with {a}\'s career (You › Heart).'), { p: pt.name, a: a.name }), 'info'); }
  }
  // aniversário (de namoro ou de casamento): lembrado com um encontro no mês ou cobrado
  if (pt) for (const [kind, w0] of [['since', pt.since], ['wed', L7.mw]] as [string, number | undefined][]) {
    if (w0 === undefined || s.week - w0 < 52) continue;
    const yrs = Math.floor((s.week - w0) / 52);
    const at = w0 + yrs * 52;
    const k = `${kind}|${yrs}`;
    if (at > s.week || s.week - at > 5 || st.ann.includes(k)) continue;
    st.ann.push(k);
    if (st.ann.length > 40) st.ann.splice(0, st.ann.length - 40);
    const remembered = s.week - pt.lastDate <= 5;
    pt.affinity = clamp(pt.affinity + (remembered ? 3 : -3), 0, 100);
    if (!remembered) notify(s, fmtL(l('Você esqueceu {y} ano(s) de {k} com {p}. Ficou chato.', 'You forgot {y} year(s) of {k} with {p}. Awkward.'), { y: yrs, k: kind === 'wed' ? l('casamento', 'marriage') : l('namoro', 'being together'), p: pt.name }), 'bad');
  }
});

/** Gente próxima de quem é o(a) amante: banda, sócios do mesmo negócio, a sua equipe mais perto. */
function closeTo31(s: GameState, ak?: string): string[] {
  const out: string[] = [];
  const a = love17(s).affair;
  const pid = a?.pid;
  if (pid) { const act = actOfP(s, pid); if (act) for (const m of act.members) if (m !== pid && s.persons[m]?.alive && !s.persons[m].isPlayer) out.push(`p:${m}`); }
  if (ak) for (const b of Object.values(socio31(s).b)) if (b.p.some((p) => p.k === ak)) for (const p of b.p) if (p.k !== ak) out.push(p.k);
  for (const st of s.player.staff.slice(0, 3)) out.push(`s:${st.id}`);
  return [...new Set(out)].filter((k) => !romanceLock31(s, k));
}

/** Acesso: um segredo do lado de lá vira trunfo seu (uma vez por pessoa). */
function intel31(s: GameState, key: string): void {
  const id = pidOf(key);
  const ids = new Set<string>([key, key.replace(/^p:/, '')]);
  if (id) { const a = actOfP(s, id); if (a) ids.add(a.id); }
  const sec = recentFacts(s, { vis: 'secret', months: 240, limit: 200 }).find((f) => f.actors.some((x) => ids.has(x)) && !f.actors.includes('player'));
  if (sec) {
    grantHold(s, { holder: 'player', target: key.replace(/^p:/, ''), kind: 'secret', strength: 35 + sec.severity / 2, months: 120, proof: 1, factId: sec.id, src: 'amor31', text: sec.text });
    log31(s, fmtL(l('Na intimidade, {n} contou: "{t}". Agora você sabe.', 'In private, {n} told you: "{t}". Now you know.'), { n: nameOf31(s, key), t: sec.text }));
  } else log31(s, fmtL(l('Com {n} você passa a ouvir o que se fala do outro lado do mercado.', 'With {n} you start hearing what is said on the other side of the market.'), { n: nameOf31(s, key) }));
}

/** Término: com gente do mercado, término ruim vira rixa (atos) ou mágoa (trunfo contra você). */
function afterEnd31(s: GameState, key: string | undefined, bad: boolean): void {
  if (!key || !marketOn31(s)) return;
  const tie = tieOf31(s, key);
  const id = pidOf(key);
  const theirs = id ? actOfP(s, id) : undefined;
  const me = playerAct(s) ?? playerActs(s).map((x) => s.acts[x]).filter(Boolean).sort((a, b) => b.fame - a.fame)[0];
  // término de casal de artistas: a dor vira disco
  if (theirs) for (const m of theirs.members) { const q = s.persons[m]; if (q?.alive) q.inspiration = clamp(q.inspiration + 12, 0, 100); }
  const pp = playerAct(s);
  if (pp && theirs) for (const m of pp.members) { const q = s.persons[m]; if (q?.alive) q.inspiration = clamp(q.inspiration + 8, 0, 100); }
  if (!tie || !bad) return;
  const st = amor31(s);
  if (theirs && me && theirs.id !== me.id && !mine(s, theirs) && startFeud18(s, me.id, theirs.id, fmtL(l('Fim de romance entre {o} e {n} vira guerra pública.', 'The end of {o} and {n}\'s romance becomes a public war.'), { o: ownerOf(s).name, n: nameOf31(s, key) }), 18)) {
    st.n.feuds++;
    return;
  }
  grantHold(s, { holder: key.replace(/^p:/, ''), target: 'player', kind: 'grievance', strength: 50, months: 48, src: 'amor31', text: l('Término ruim com o dono do selo', 'A bad breakup with the label owner') });
  opine(s, key, -25, l('terminou comigo e ainda me deve.', 'broke up with me and still owes me.'));
}

// término do relacionamento oficial (life.breakUp): rixa/mágoa com gente do mercado
onFact('breakup', (s, f) => {
  if (!f.actors.includes('player') || f.src !== 'love17') return;
  const k = peek(s).pk;
  if (k) afterEnd31(s, k, true);
}, 'amor31:breakup');

/** Fim do relacionamento atual pela ficha "Coração" (usa as funções antigas). */
export function endWith31(s: GameState, which: 'partner' | 'affair'): AskRes31 {
  if (which === 'affair') {
    const ak = affairKey31(s);
    const t = endAffair(s, rng19(s, 'amor31'));
    amor31(s).knows = [];
    if (ak) opine(s, ak, -10, l('terminou o nosso caso.', 'ended our affair.'));
    afterEnd31(s, ak, /descobriu|found out/.test(t.pt + t.en) || (ak ? opinionOf(s, ak) < 0 : false));
    return { ok: true, text: t };
  }
  const pk = partnerKey31(s);
  const pt = life(s).partner;
  if (!pt) return { ok: false, text: l('Você não está num relacionamento.', 'You are not in a relationship.') };
  if (pt.stage === 'married') return { ok: false, text: l('Casamento só termina em divórcio (veja as condições acima).', 'A marriage only ends in divorce (see the terms above).') };
  breakUp(s);
  if (pk) { opine(s, pk, -15, l('terminou comigo.', 'broke up with me.')); afterEnd31(s, pk, opinionOf(s, pk) < 10); }
  return { ok: true, text: fmtL(l('Você terminou com {p}.', 'You broke up with {p}.'), { p: pt.name }) };
}

/** Ajudar a carreira do par (pedido aberto). */
export function helpLock31(s: GameState): Lock31 | null {
  const st = peek(s);
  if (!st.req || !s.acts[st.req.act]) return lock31(l('Nenhum pedido de ajuda agora.', 'No request for help right now.'), UNLOCK31.generic);
  if (energyLeft(s) < 1) return lock31(l('Sem tempo livre este mês.', 'No free time left this month.'), UNLOCK31.time);
  if (ownerOf(s).wealth < money(s, 2000)) return lock31(l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.'), UNLOCK31.cash);
  return null;
}
export function answerHelp31(s: GameState, yes: boolean): AskRes31 {
  const st = amor31(s);
  const pt = life(s).partner;
  if (!st.req || !pt) return { ok: false, text: l('Nenhum pedido de ajuda agora.', 'No request for help right now.') };
  const a = s.acts[st.req.act];
  if (!yes) { pt.affinity = clamp(pt.affinity - 6, 0, 100); st.req = undefined; return { ok: true, text: fmtL(l('Você disse que não pode. {p} ficou magoado(a).', 'You said you can\'t. {p} was hurt.'), { p: pt.name }) }; }
  const lk = helpLock31(s);
  if (lk) return { ok: false, text: lk.why };
  const e = spendEnergy(s, 1);
  if (e) return { ok: false, text: e };
  purse(s, -money(s, 2000), 'family', 'amor31:help', { who: ownerOf(s), ben: `act:${a.id}` });
  hype(s, a.id, 5, l('Ajuda do par dono de selo', 'Help from the label-owner partner'));
  pt.affinity = clamp(pt.affinity + 8, 0, 100);
  st.req = undefined;
  return { ok: true, text: fmtL(l('Você apresentou {a} a quem importa e pagou a divulgação. {p} não esquece.', 'You introduced {a} to the people who matter and paid for promotion. {p} won\'t forget.'), { a: a.name, p: pt.name }) };
}

// presentes da loja (H) que chegam ao par ou ao(à) amante
onFact('gift', (s, f) => {
  if (!askOn31(s) || f.src !== 'items31' || f.actors[0] !== 'player') return;
  const to = f.actors[1];
  const pt = life(s).partner;
  if (pt?.personId === to) { pt.affinity = clamp(pt.affinity + Math.min(10, 2 + Math.round(f.severity / 4)), 0, 100); pt.lastDate = Math.max(pt.lastDate, s.week - 2); }
  const a = love17(s).affair;
  if (a?.pid === to && affairOn31(s)) a.disc = clamp(a.disc - 3, 5, 95); // presente deixa rastro
}, 'amor31:gift');

// ---------------------------------------------------------------- calendário: aniversários

registerDeadline('amor31', (s, from, to) => {
  const pt = life(s).partner;
  if (!pt) return [];
  const out: { id: string; w: number; kind: 'other'; t: L; tone: 'info'; goto: { area: string; tab: [string, string] } }[] = [];
  for (const [kind, w0] of [['since', pt.since], ['wed', love17(s).mw]] as [string, number | undefined][]) {
    if (w0 === undefined) continue;
    for (let y = Math.max(1, Math.ceil((from - w0) / 52)); w0 + y * 52 <= to; y++) {
      const w = w0 + y * 52;
      if (w < from) continue;
      out.push({ id: `amor31:${kind}:${y}`, w, kind: 'other', tone: 'info', goto: { area: 'personal', tab: ['life-personal', 'heart17'] },
        t: fmtL(kind === 'wed' ? l('{y} ano(s) de casamento com {p} — marque um encontro', '{y} year(s) married to {p} — plan a date') : l('{y} ano(s) com {p} — marque um encontro', '{y} year(s) with {p} — plan a date'), { y, p: pt.name }) });
    }
  }
  return out;
});

// ---------------------------------------------------------------- menu de ações de pessoa

// o "flertar" do menu de pessoa (sys/personact18) passa a usar o pedido novo quando 'amor31.ask' está ligado: o mesmo
// item, com a chance e os fatores daqui e o motivo da recusa; desligado, volta a ser exatamente o antigo.
const flirt = personActionDefs18().find((d) => d.id === 'flirt');
if (flirt) {
  const old = { ...flirt };
  registerPersonAction({
    ...old,
    desc: l('Namoro (solteiro), caso secreto (comprometido) ou você como amante (a pessoa é casada). Com "Amor: chamar qualquer pessoa" ligado, a resposta é a conta mostrada e a recusa diz o motivo.', 'Dating (single), a secret affair (taken) or you as the lover (they are married). With "Love: ask anyone out" on, the answer is the odds shown and a refusal says why.'),
    visible: (s, k) => !romanceLock31(s, k) && (askOn31(s) ? PERSONLIKE.includes(k.split(':')[0]) && !(s.persons[k.slice(2)]?.isPlayer) : (old.visible ? old.visible(s, k) : true)),
    cooldown: undefined,
    selfRoll: true, // a resposta é sorteada no próprio pedido (ligado) ou como antes, com o mesmo gerador (desligado)
    cost: (s, k) => (askOn31(s) ? { usd: PERSON_COST31, balls: 1, shown: true } : old.cost?.(s, k) ?? {}),
    available: (s, k) => { if (!askOn31(s)) return old.available?.(s, k) ?? null; const lk = askLock31(s, k); return lk && !/tempo livre|free time/.test(lk.why.pt + lk.why.en) ? lk.why : null; },
    chance: (s, k) => { if (!askOn31(s)) return old.chance?.(s, k) ?? null; const o = askOdds31(s, k); return { p: o.p, why: o.why.map(([t, v]) => fmtL(l('{t} {v}', '{t} {v}'), { t, v: pctS(v) })) }; },
    run: (s, k, r, ok) => {
      if (!askOn31(s)) { const ch = old.chance?.(s, k); const out = old.run(s, k, r, ch ? r.chance(clamp(ch.p, 0, 1)) : ok); if (old.cooldown) pa18(s).cd[`flirt|${k}`] = s.week + old.cooldown; return out; }
      // o menu já cobrou o tempo livre: devolve antes de pedir (o pedido cobra o seu)
      life(s).used = Math.max(0, life(s).used - 1);
      const res = askOut31(s, k);
      return { ok: res.ok, text: res.text };
    },
  });
}
void pa18;

// ---------------------------------------------------------------- editor (regra 10)

registerEditable({ id: 'amor31.ask', area: 'people', kind: 'bool', label: l('Amor: chamar qualquer pessoa para sair', 'Love: ask anyone out'), get: (s) => askOn31(s), set: (s, v) => { setSw(s, SW_ASK31, !!v); } });
registerEditable({ id: 'amor31.affair', area: 'people', kind: 'bool', label: l('Amor: casos e ser amante', 'Love: affairs and being the lover'), get: (s) => affairOn31(s), set: (s, v) => { setSw(s, SW_AFFAIR31, !!v); } });
registerEditable({ id: 'amor31.market', area: 'people', kind: 'bool', label: l('Amor: romance com gente do mercado', 'Love: romance with market people'), get: (s) => marketOn31(s), set: (s, v) => { setSw(s, SW_MARKET31, !!v); } });
registerEditable({
  id: 'amor31.affinity', area: 'people', kind: 'number', min: 0, max: 100, raw: true, label: l('Afinidade com o par atual', 'Affinity with the current partner'),
  when: (s) => !!life(s).partner, get: (s) => Math.round(life(s).partner?.affinity ?? 0),
  set: (s, v) => { const pt = life(s).partner; if (!pt) return l('Sem par.', 'No partner.'); pt.affinity = clamp(Number(v) || 0, 0, 100); },
});
registerEditable({
  id: 'amor31.disc', area: 'people', kind: 'number', min: 0, max: 100, raw: true, label: l('Discrição do caso atual', 'Discretion of the current affair'),
  when: (s) => !!love17(s).affair, get: (s) => Math.round(love17(s).affair?.disc ?? 0),
  set: (s, v) => { const a = love17(s).affair; if (!a) return l('Sem caso.', 'No affair.'); a.disc = clamp(Number(v) || 0, 0, 100); },
});
registerRunnable({
  id: 'amor31.discover', area: 'people', label: l('Fazer o par descobrir o caso agora', 'Make your partner discover the affair now'),
  run: (s) => (discoverAffair17(s, l('Uma carta esquecida no bolso do paletó.', 'A letter forgotten in a jacket pocket.')) ? l('O par descobriu o caso.', 'Your partner found out about the affair.') : l('Não há caso em andamento.', 'There is no affair going on.')),
});
registerRunnable({
  id: 'amor31.clearcd', area: 'people', label: l('Apagar as recusas recentes (pode chamar de novo)', 'Clear recent refusals (can ask again)'),
  run: (s) => { amor31(s).cd = {}; return l('Recusas apagadas.', 'Refusals cleared.'); },
});

/** Resumo para a ficha (só lê). */
export interface Heart31 { pk?: string; ak?: string; ptie: Tie31 | null; atie: Tie31 | null; risk: number; parts: [L, number][]; knows: { key: string; name: string; gossip: boolean }[]; req?: { w: number; act: string }; last?: Amor31St['last']; log: [number, L][]; press: L; moral: number }
export function heart31(s: GameState): Heart31 {
  const pk = partnerKey31(s), ak = affairKey31(s);
  const st = peek(s);
  return { pk, ak, ptie: pk ? tieOf31(s, pk) : null, atie: ak ? tieOf31(s, ak) : null, risk: affairRisk17(s), parts: riskParts31(s), knows: love17(s).affair ? whoKnows31(s) : [], req: st.req, last: st.last && st.last.w >= s.week - 12 ? st.last : undefined, log: st.log ?? [], press: pressEra31(s.year).name, moral: moral31(s) };
}
export type { Affair17, Partner };
