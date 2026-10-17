// R33 · APARELHOS33 — MODELO DO CELULAR E DO COMPUTADOR (sem DOM; testes em tests/r33-aparelhos.test.ts).
// Mesmo contrato do cartão de ações (ACOES5): cada ação guarda a função que JÁ EXISTE (`fn`, com o módulo em `src` para o
// teste conferir a referência) e só a chama; custos, chances e bloqueios são os da função. Época em três níveis:
//   1. o aparelho (5 versões: sim/r33/aparelhos33 PHONE33/PC33);
//   2. os apps de cada versão (tabelas PHONE_APPS33/PC_APPS33, as da especificação docs/r33/CELULAR_PC.md);
//   3. as ações de cada app (faixa de anos `de`–`ate`; o app só mostra as do ano).
// App de sistema desligado some (`sys`); ação sem dinheiro, bolinha ou alvo aparece cinza com o motivo (`lock`).
// GANCHO para outras frentes (REDES33): `registerPhoneApp33` / `registerPcApp33` (id, anos, ícone, "!", abrir) — o app
// entra no lugar reservado da tabela (o Redes já tem o lugar dele) sem editar a casca. Montar as telas só lê.

import { genreById, l, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import { sw } from '../../sim/r31/switches';
import { lock31, UNLOCK31, type Lock31 } from '../../sim/r31/lock';
import { pendingList } from '../../sim/r31/pending';
import { playerActs, fmtL, money } from '../../sim/util';
import { $ } from '../common';
import {
  aiAnswer33, aiLock33, ap33On, callCost33, callKind33, callLock33, CALL_L33, homeDemo33, leakChoice33, makeRingtone33, peekAp33, phoneCall33,
  pirItems33, pirLock33, pirTotal33, reportPiracy33, resolvePiracy33, ringLife33, ringLock33, setFanSub33, subIncome33, subLock33, endGame33, phoneV33 as phoneVer, pcV33 as pcVer, type Dev33,
} from '../../sim/r33/aparelhos33';
// funções que já existem (fonte única)
import { dig18, chNow18, chCost18, disc18, showsNow18, watchShow18 } from '../../sim/sys/discover18';
import { watchAct } from '../../sim/scouting';
import { toggleWatch } from '../../sim/sys/scout11';
import { defaultOffer, evaluateOffer } from '../../sim/contracts';
import { pitchRadio18, fmtsNow18, lunchPd18, spins18, stationCity18 } from '../../sim/sys/radio18';
import { pitchPlaylist18, st18, retOf18, farmRisk18 } from '../../sim/sys/stream18';
import { addList31, dropList31 } from '../../sim/sys/car31plat';
import { archive18, star18 } from '../../sim/inbox18';
import { inboxItems } from '../../sim/sys/people/inbox';
import { ag17, balls, reserved } from '../../sim/sys/agenda17';
import { calendar19 } from '../../sim/calendar19';
import { setRoutine33, vida33, stressDot33, frail33, treatOwner33, donate33, foundFoundation33, papChance33, setGuard33, buildWall33, SW33 } from '../../sim/r33/vida33';
import { formatLife33 } from '../../sim/r33/formats33';
import { repertoire27 } from '../../sim/sys/show27';
import { videoOpen18, makeVideo18, choreoFee18 } from '../../sim/sys/media18';
import { memes33On, pulse33, mundoNow33, creditCrisis33 } from '../../sim/r33/mundo33';
import { resolveFake18, licenseClone18, canClone18, setAiMode18, platformPolicy18 } from '../../sim/sys/ai18';
import { buyable19, buyOutlet19 } from '../../sim/sys/zines19';
import { review18, scoop18, embargo18 } from '../../sim/sys/press18';
import { balanceSheet, totalDebt } from '../../sim/finance';
import { loanOffer, takeLoan } from '../../sim/economy';
import { pledge33, unpledge33 } from '../../sim/r33/relic33';
import { insureKey19 } from '../../sim/sys/insure19';
import { listed, change12, holdingsOf, controlShare, raiders, repelRaider } from '../../sim/sys/bolsa10';
import { remoteCat31, remoteOpen31, remotePrice31, remoteName31, orderDeco31, decoShopsOn31, vintage31, type DecoVia31, type DecoHow31 } from '../../sim/r31/decoshop31';
import { openSessions31 } from '../../sim/sys/auction31';
import { sheet31, top31, writeBid31, bidLock31, fakeOdds31, baucOn31 } from '../../sim/sys/bauc31';
import { noteSale31 } from '../../sim/r31/relic31';
import { setTix, cal17 } from '../../sim/sys/clash17';
import { ticketShock18, fans18, factions18, setTeam18 } from '../../sim/sys/fans18';
import { tourList, cityDemand } from '../../sim/tours';
import { departures31 } from '../../sim/sys/travel31';
import { districtStage33, lotValue33, neighbourOf33, openShop33, shopLock33 } from '../../sim/r33/cidade33';
import { LOTS18 } from '../../sim/sys/campus18';
import { buyLot31, lotLock31, lotPrice31, lotsOn31 } from '../../sim/sys/lots31';
import { askLock31, askOdds31, askOut31, askRoll31, isFossati31, askOn31, marriedOther31, partnerKey31 } from '../../sim/sys/amor31';
import { gente31, jobOf31 } from '../../sim/sys/gente31';
import { introVia31, askIntro31 } from '../../sim/sys/social31sys';
import { famNow31, famLock31, luciaLunch31, lasagna31, soniaPromo31, antonellaPress31 } from '../../sim/sys/fossati31';
import { heirCandidates, inheritancePreview } from '../../sim/sys/heirs8';
import { addHype } from '../../sim/sys/hype12';
import { lessons31 } from '../../sim/r31/learn31';
import { calib33, learnWidth33 } from '../../sim/r33/learn33';
import { respView31, setMode31 } from '../../sim/deleg31';
import { pressPick33 } from '../../sim/r33/dir33';
import { resolveCase33, answerReq33 } from '../../sim/r33/sample33';
import { canSell, makeBatch, toggleLicense, toggleFight, unitPrice } from '../../sim/sys/merch17';
import { takeAd19 } from '../../sim/sys/adsync19';
import { ego33 } from '../../sim/r33/pessoas33';
import { gearNow19 } from '../../sim/sys/gear19';
import { clausesOf } from '../../sim/sys/contracts18';
import { socOptions18 } from '../../sim/sys/rights18';
import { pirateLoss31 } from '../../sim/r31/vitrine31';
import { energyLeft, playerPerson } from '../../sim/sys/life';
import { ownerOf } from '../../sim/sys/people/owner';
import { activeMgrs } from '../../sim/sys/managers14';
import { openFicha13 } from '../sys/persona13';
import { openOffer } from '../ficha';
import { travelGo5 } from '../r31/nav5';
import { rng19 } from '../../sim/rng19';
import type { Px } from '../pixel/px';
import { decoPx5 } from '../r31/deco5px';

// ---------------------------------------------------------------- tipos

export type Kind33 = 'do' | 'go' | 'ui' | 'read' | 'game';
/** Resultado de uma ação "do": a frase do aviso (erro da regra = bad). */
export interface Res33 { text: L; bad?: boolean }
/** O que a interface entrega à ação. */
export interface Ctx33 {
  /** leva ao objeto do mundo (cartão de ações ACOES5) ou ao papel dele no marcador */
  go: (obj: string, mark?: { area: string; tab?: [string, string] }) => void;
  /** viagem (cidade, mundo…) */
  travel: (r: 'sede' | 'casa' | 'cidade' | 'mundo') => void;
  /** abre outro app do aparelho */
  app: (id: string) => void;
  /** fecha o aparelho */
  close: () => void;
  say: (t: L, kind?: 'good' | 'bad' | 'info') => void;
  refresh: () => void;
}
/** Item de uma lista dentro do app (contato, perfil, peça do catálogo, lote…). */
export interface Item33 { arg: string; title: L | string; sub?: L | string; face?: string; price?: number; tag?: L; /** miniatura em pixel art (peça do catálogo) */ pic?: () => Px }
export interface ActDef33 {
  app: string;
  label: L;
  /** faixa de anos em que a ação existe (ate ausente = até o fim) */
  de: number; ate?: number;
  /** só neste aparelho */
  dev?: Dev33;
  kind: Kind33;
  /** a função de hoje que a ação chama (fonte única) e o módulo dela a partir de src/ */
  fn: (...a: never[]) => unknown;
  src: [string, string];
  /** sistema de origem ligado? (desligado = a ação some) */
  sys?: (s: GameState) => boolean;
  /** só aparece quando faz sentido (tem dívida, tem relíquia…) */
  when?: (s: GameState) => boolean;
  /** motivo do bloqueio, antes do clique (`arg` = item da lista) */
  lock?: (s: GameState, arg?: string) => Lock31 | L | null | undefined;
  run: (s: GameState, c: Ctx33, arg?: string) => Res33 | void;
  /** linha curta sob o botão (custo, chance) */
  hint?: (s: GameState, arg?: string) => L | null;
  /** linhas de leitura (ações "read") */
  lines?: (s: GameState) => L[];
  /** lista de itens: a ação vira um botão por item; ações com o mesmo `group` dividem o mesmo cartão do item */
  items?: (s: GameState) => Item33[];
  group?: string;
  /** mostra um item de cada vez (Encontros) */
  one?: boolean;
}
export interface AppDef33 {
  id: string;
  name: L | ((s: GameState, d: Dev33) => L);
  /** ícone (desenho em aparelhos33px; app de fora pode trazer o seu) */
  icon: string;
  /** anos do app (antes de `de`, some mesmo que a versão o tenha) */
  de?: number; ate?: number;
  /** sistema de origem ligado? */
  sys?: (s: GameState) => boolean;
  /** "!" do app (mesmas pendências de hoje) */
  bang?: (s: GameState) => number;
  /** abrir: tela própria (app de outra frente); sem isto, a casca monta a lista de ações do catálogo */
  open?: (c: AppOpen33) => unknown;
}
/** O que a casca entrega a um app de outra frente que desenha a própria tela. */
export interface AppOpen33 { s: GameState; dev: Dev33; ver: number; ctx: Ctx33; box: { w: number; h: number } }

// ---------------------------------------------------------------- versões e apps (tabelas da especificação)

/** Apps de cada versão do celular (ordem = ordem na tela). 'redes' é da REDES33 (lugar reservado, entra pelo gancho). */
export const PHONE_APPS33: Record<number, string[]> = {
  1983: ['ligar', 'agenda', 'recados'],
  1997: ['ligar', 'recados', 'agenda', 'toques', 'jogo', 'radio', 'familia'],
  2007: ['ligar', 'recados', 'agenda', 'musica', 'videos', 'noticias', 'mapa', 'camera', 'jogo', 'banco', 'redes', 'faclube'],
  2012: ['ligar', 'recados', 'videos', 'redes', 'streaming', 'radio', 'noticias', 'banco', 'bolsa', 'compras', 'leilao', 'ingressos', 'mapa', 'agenda', 'camera', 'encontros', 'familia', 'imoveis', 'saude', 'faclube', 'jogo'],
  2032: ['ligar', 'recados', 'videos', 'redes', 'streaming', 'radio', 'noticias', 'banco', 'bolsa', 'compras', 'leilao', 'ingressos', 'mapa', 'agenda', 'camera', 'encontros', 'familia', 'imoveis', 'saude', 'faclube', 'jogo', 'assistente'],
};
/** Apps de cada versão do computador. Encontros entra pela tabela de Encontros (sala de bate-papo 1996, site 2003). */
export const PC_APPS33: Record<number, string[]> = {
  1982: ['planilha', 'contratos', 'relatorios', 'jogo'],
  1995: ['planilha', 'contratos', 'relatorios', 'jogo', 'email', 'site', 'compras', 'bolsa', 'editor', 'encontros'],
  2003: ['planilha', 'contratos', 'relatorios', 'jogo', 'email', 'site', 'compras', 'bolsa', 'editor', 'encontros', 'forum', 'redes', 'demos', 'leilao', 'noticias', 'loja'],
  2012: ['planilha', 'contratos', 'relatorios', 'jogo', 'email', 'site', 'compras', 'bolsa', 'editor', 'encontros', 'forum', 'redes', 'demos', 'leilao', 'noticias', 'loja', 'videos', 'painel', 'anuncios'],
  2032: ['planilha', 'contratos', 'relatorios', 'jogo', 'email', 'site', 'compras', 'bolsa', 'editor', 'encontros', 'forum', 'redes', 'demos', 'leilao', 'noticias', 'loja', 'videos', 'painel', 'anuncios', 'ia'],
};
export const appTable33 = (d: Dev33): Record<number, string[]> => (d === 'phone' ? PHONE_APPS33 : PC_APPS33);

// ---------------------------------------------------------------- ajudas

const on = (id: string) => (s: GameState): boolean => sw<boolean>(s, id);
const none = (why: L) => lock31(why, UNLOCK31.generic);
const myActs = (s: GameState): string[] => playerActs(s).filter((id) => s.acts[id] && s.acts[id].status !== 'retired' && s.acts[id].status !== 'split');
const act0 = (s: GameState): string | undefined => myActs(s)[0];
const noAct = l('Você ainda não tem artista no elenco.', 'You have no act on the roster yet.');
const actLock = (s: GameState) => (act0(s) ? null : lock31(noAct, UNLOCK31.roster));
const rel0 = (s: GameState, f: (r: GameState['releases'][string]) => boolean = () => true) => Object.values(s.releases).filter((r) => r.owner === 'player' && f(r)).sort((a, b) => b.week - a.week)[0];
/** Resultado de uma função de hoje → aviso (null/true = ok; L = erro ou frase; {ok,text}). */
export function res33(x: unknown, ok: L): Res33 {
  if (x == null || x === true) return { text: ok };
  if (x === false) return { text: l('Não deu agora.', 'Not possible right now.'), bad: true };
  if (typeof x === 'object') {
    const o = x as Record<string, unknown>;
    if ('pt' in o && 'en' in o) return { text: o as unknown as L };
    if ('text' in o) return { text: o.text as L, bad: 'ok' in o ? !o.ok : false };
  }
  return { text: ok };
}
/** Erro de uma função que devolve L só quando falha (null = deu certo). */
const err33 = (x: L | null, ok: L): Res33 => (x ? { text: x, bad: true } : { text: ok });
const pct = (v: number) => `${Math.round(v * 100)}%`;
const fx = (pt: string, en: string, v: Record<string, string | number | L>): L => fmtL(l(pt, en), v);
const R = (s: GameState) => rng19(s, 'act');

// ---------------------------------------------------------------- APPS

const A: Record<string, AppDef33> = {
  ligar: { id: 'ligar', name: l('Ligar', 'Call'), icon: 'ligar', bang: (s) => bangOf(s, ['telefone', 'telefonecasa']) },
  recados: { id: 'recados', name: (s) => (s.year < 1997 ? l('Caixa postal', 'Voicemail') : s.year < 2009 ? l('Mensagens', 'Texts') : l('Recados', 'Messages')), icon: 'recados', bang: (s) => bangOf(s, ['correspondencia', 'secretaria']) },
  agenda: { id: 'agenda', name: l('Agenda', 'Planner'), icon: 'agenda', bang: (s) => bangOf(s, ['agenda']) },
  toques: { id: 'toques', name: l('Toques', 'Ringtones'), icon: 'toques', de: 1997, ate: 2009 },
  jogo: { id: 'jogo', name: l('Jogo', 'Game'), icon: 'jogo' },
  radio: { id: 'radio', name: l('Rádio', 'Radio'), icon: 'radio', bang: (s) => bangOf(s, ['radiotv']) },
  familia: { id: 'familia', name: l('Família', 'Family'), icon: 'familia', sys: on('fam31'), bang: (s) => bangOf(s, ['portaretrato']) },
  musica: { id: 'musica', name: l('Música', 'Music'), icon: 'musica' },
  videos: { id: 'videos', name: l('Vídeos', 'Videos'), icon: 'videos', de: 2006, bang: (s) => ai18Fake(s) ? 1 : 0 },
  noticias: { id: 'noticias', name: l('Notícias', 'News'), icon: 'noticias', bang: (s) => bangOf(s, ['jornal']) },
  mapa: { id: 'mapa', name: l('Mapa', 'Map'), icon: 'mapa' },
  camera: { id: 'camera', name: l('Câmera', 'Camera'), icon: 'camera' },
  banco: { id: 'banco', name: l('Banco', 'Bank'), icon: 'banco', bang: (s) => bangOf(s, ['livrocaixa']) },
  redes: { id: 'redes', name: l('Redes', 'Social'), icon: 'redes' }, // REDES33 substitui pelo gancho (sem registro = não aparece)
  faclube: { id: 'faclube', name: (_s, d) => (d === 'pc' ? l('Site e fã-clube', 'Site and fan club') : l('Fã-clube', 'Fan club')), icon: 'faclube' },
  streaming: { id: 'streaming', name: l('Streaming', 'Streaming'), icon: 'streaming' },
  bolsa: { id: 'bolsa', name: l('Bolsa', 'Stocks'), icon: 'bolsa' },
  compras: { id: 'compras', name: l('Compras', 'Shopping'), icon: 'compras', sys: decoShopsOn31 },
  leilao: { id: 'leilao', name: l('Leilão', 'Auction'), icon: 'leilao', de: 2003, sys: on('auction31'), bang: (s) => bangOf(s, ['leiloes']) },
  ingressos: { id: 'ingressos', name: l('Ingressos', 'Tickets'), icon: 'ingressos' },
  encontros: { id: 'encontros', name: (s) => (s.year >= 2032 ? l('Encontros', 'Dating') : s.year >= 2012 ? l('Encontros', 'Dating') : s.year >= 2003 ? l('Site de namoro', 'Dating site') : l('Sala de bate-papo', 'Chat room')), icon: 'encontros', de: 1996, sys: askOn31 },
  imoveis: { id: 'imoveis', name: l('Imóveis', 'Property'), icon: 'imoveis', sys: lotsOn31 },
  saude: { id: 'saude', name: l('Saúde', 'Health'), icon: 'saude', de: 2014 },
  assistente: { id: 'assistente', name: l('Assistente', 'Assistant'), icon: 'assistente', de: 2032 },
  // computador
  planilha: { id: 'planilha', name: l('Planilha', 'Spreadsheet'), icon: 'planilha', bang: (s) => bangOf(s, ['livrocaixa']) },
  contratos: { id: 'contratos', name: l('Contratos', 'Contracts'), icon: 'contratos', bang: (s) => bangOf(s, ['arquivoaco']) },
  relatorios: { id: 'relatorios', name: l('Relatórios', 'Reports'), icon: 'relatorios', bang: (s) => bangOf(s, ['chefe']) },
  email: { id: 'email', name: l('E-mail', 'E-mail'), icon: 'recados', de: 1995, bang: (s) => bangOf(s, ['correspondencia']) },
  site: { id: 'site', name: l('Site e fã-clube', 'Site and fan club'), icon: 'faclube', de: 1995 },
  editor: { id: 'editor', name: l('Editor de áudio', 'Audio editor'), icon: 'editor', de: 1995 },
  forum: { id: 'forum', name: l('Fórum e P2P', 'Forum and P2P'), icon: 'forum', de: 1999, ate: 2010, sys: on('vit31') },
  demos: { id: 'demos', name: l('Demos online', 'Online demos'), icon: 'demos', de: 2003, bang: (s) => bangOf(s, ['demos']) },
  loja: { id: 'loja', name: l('Loja online', 'Online store'), icon: 'loja', de: 2003 },
  painel: { id: 'painel', name: l('Painel do artista', 'Artist dashboard'), icon: 'painel', de: 2012 },
  anuncios: { id: 'anuncios', name: l('Anúncios', 'Ads'), icon: 'anuncios', de: 2012 },
  ia: { id: 'ia', name: l('IA de produção', 'Production AI'), icon: 'ia', de: 2030 },
};
/** "!" de um app = soma dos "!" dos objetos donos (as mesmas pendências de hoje, nav5.bangs5). Ligado na interface. */
export const BANGS33: { of?: (s: GameState) => Record<string, number> } = {};
function bangOf(s: GameState, objs: string[]): number { const b = BANGS33.of?.(s); return b ? objs.reduce((t, o) => t + (b[o] ?? 0), 0) : 0; }
const ai18Fake = (s: GameState) => ((s.x4 as unknown as { ai18?: { fakes?: { act: string; ch?: string }[] } }).ai18?.fakes ?? []).find((f) => !f.ch && s.acts[f.act] && myActs(s).includes(f.act));

// ---------------------------------------------------------------- AÇÕES

const D = (app: string, label: L, de: number, src: [string, string], fn: ActDef33['fn'], run: ActDef33['run'], o: Partial<ActDef33> = {}): ActDef33 => ({ app, label, de, src, fn, kind: 'do', run, ...o });
const G = (app: string, label: L, de: number, src: [string, string], fn: ActDef33['fn'], obj: string, o: Partial<ActDef33> & { mark?: { area: string; tab?: [string, string] } } = {}): ActDef33 =>
  ({ app, label, de, src, fn, kind: 'go', run: (_s, c) => { c.go(obj, o.mark); }, ...o });
const Rd = (app: string, label: L, de: number, src: [string, string], fn: ActDef33['fn'], lines: (s: GameState) => L[], o: Partial<ActDef33> = {}): ActDef33 => ({ app, label, de, src, fn, kind: 'read', run: () => undefined, lines, ...o });

/** Contatos do Ligar: líderes do elenco e quem você mais conhece. */
function contacts33(s: GameState): Item33[] {
  const out: Item33[] = [];
  for (const id of myActs(s)) { const a = s.acts[id]; const p = a.members.map((m) => s.persons[m]).find((x) => x?.alive); if (p) out.push({ arg: p.id, title: p.name, sub: a.name, face: p.id }); }
  return out.slice(0, 5);
}
/** Perfis do Encontros: gente que trabalha nos lugares da cidade (gente31/jobOf31) e solteiros do meio. NUNCA Fossati, nunca menores. */
export function profiles33(s: GameState): Item33[] {
  const st = peekAp33(s);
  const seen = new Set<string>();
  const out: Item33[] = [];
  const add = (pid: string, sub: L) => {
    const p = s.persons[pid];
    const key = `p:${pid}`;
    if (!p || seen.has(pid) || !p.alive || p.isPlayer) return;
    seen.add(pid);
    if (isFossati31(s, key) || s.year - p.born < 18) return;
    if (st?.swipe[key]?.[0] === 'x' || partnerKey31(s) === key || marriedOther31(s, key)) return;
    out.push({ arg: key, title: `${p.name}, ${s.year - p.born}`, sub, face: pid });
  };
  for (const [, j] of Object.entries(gente31(s).j ?? {})) { const jb = jobOf31(s, j.p); if (jb) add(j.p, fx('{r} · {a}', '{r} · {a}', { r: jb.role, a: jb.at })); }
  const mine = new Set(myActs(s));
  for (const a of Object.values(s.acts)) {
    if (a.city !== s.config.homeCity || a.status !== 'active' || mine.has(a.id)) continue;
    for (const m of a.members.slice(0, 1)) add(m, fx('Artista · {a}', 'Artist · {a}', { a: a.name }));
    if (out.length > 24) break;
  }
  return out;
}
const encKind = (s: GameState): L => (s.year >= 2032 ? l('encontro em holograma', 'hologram date') : s.year >= 2012 ? l('arrastar para o lado', 'swipe') : s.year >= 2003 ? l('site de namoro', 'dating site') : l('sala de bate-papo', 'chat room'));
/** O match do Encontros: a MESMA chance do "chamar para sair" (askOdds31/askRoll31); super curtida soma 5 pontos. */
export function matchOf33(s: GameState, key: string, sup = false): { ok: boolean; p: number } {
  const p = Math.min(0.95, askOdds31(s, key).p + (sup ? 0.05 : 0));
  return { ok: askRoll31(s, key) < p, p };
}
const swipe33 = (s: GameState, key: string, k: string): void => {
  const x = (s.x4 as unknown as Record<string, unknown>);
  const st = (x.ap33 ??= { rec: {}, calm: [0, 0], ring: {}, sub: {}, swipe: {}, pir: [], seq: 0 }) as { swipe: Record<string, [string, number]> };
  st.swipe[key] = [k, s.week];
};
/** Peças da compra a distância (o mesmo catálogo e preço do decoshop31). */
const via33 = (s: GameState): DecoVia31 => (remoteOpen31(s, 'net') ? 'net' : 'mail');
let SHOP_TO33: DecoHow31 = 'co';
export const setShopTo33 = (h: DecoHow31): void => { SHOP_TO33 = h; };
export const shopTo33 = (): DecoHow31 => SHOP_TO33;
const catItems33 = (s: GameState): Item33[] => remoteCat31(s, via33(s)).slice(0, 24).map((d) => ({ arg: d.id, title: d.name, sub: d.cat === 'hifi' ? l('eletrônicos', 'electronics') : d.cat === 'art' ? l('arte', 'art') : l('móveis e decoração', 'furniture and decor'), price: remotePrice31(s, d, via33(s)), pic: () => decoPx5(d, s.year) }));
/** Linha da loja a distância: o nome da época e o prazo (correio: semanas; 1999: dias; 2015: no dia; 2030: drone). */
export const shopLine33 = (s: GameState): L => fx('{n} · {d}', '{n} · {d}', { n: remoteName31(via33(s), s.year), d: deliv33(s) });
const deliv33 = (s: GameState): L => (s.year >= 2030 ? l('entrega por drone', 'drone delivery') : s.year >= 2015 ? l('entrega no mesmo dia', 'same-day delivery') : s.year >= 1999 ? l('entrega em dias', 'delivery in days') : l('entrega em semanas, pelo correio', 'delivery in weeks, by post'));
const leadOf = (s: GameState): string | undefined => { const ls = disc18(s).leads.filter((x) => x.ch === 'youtube' || x.ch === 'tiktok' || x.ch === 'myspace' || x.ch === 'soundcloud'); return ls[ls.length - 1]?.a; };
const lots33 = (s: GameState): Item33[] => {
  const out: Item33[] = [];
  for (let i = 1; i < LOTS18.length && out.length < 4; i++) {
    const why = lotLock31(s, i);
    if (why && why.pt !== 'Caixa insuficiente.' && !why.pt.startsWith('Caixa')) continue;
    out.push({ arg: String(i), title: LOTS18[i].name, price: lotPrice31(s, i) });
  }
  return out;
};
const bidLots33 = (s: GameState): Item33[] => (sheet31(s)?.lots ?? []).filter((x) => x.st === 'open').slice(0, 4).map((x) => ({ arg: x.id, title: x.n, sub: fx('Lance mínimo {v} · risco de falsificação {p}', 'Minimum bid {v} · forgery risk {p}', { v: $(top31(s, x).need), p: pct(fakeOdds31(s, x)) }), price: top31(s, x).need }));
const fakeAct = (s: GameState) => ai18Fake(s)?.act;
const pendRel = (s: GameState) => s.pendingReleases.find((p) => myActs(s).includes(p.actId));

const C: Record<string, ActDef33> = {
  // ======================================================== LIGAR
  'lig.contato': D('ligar', l('Ligar', 'Call'), 1983, ['sim/r33/aparelhos33', 'phoneCall33'], phoneCall33, (s, c, pid) => { const t = phoneCall33(s, pid!); openFicha13(`p:${pid}`); c.close(); return { text: t }; },
    { items: contacts33, group: 'contato', lock: (s, pid) => (pid ? callLock33(s, pid) : actLock(s)), hint: (s) => { const c = callCost33(s); return c ? fx('{k}: {v} por 10 minutos', '{k}: {v} per 10 minutes', { k: CALL_L33[callKind33(s.year)], v: $(c) }) : CALL_L33[callKind33(s.year)]; } }),
  'lig.empresario': G('ligar', l('Empresários e agentes (propostas)', 'Managers and agents (offers)'), 1983, ['sim/sys/managers14', 'activeMgrs'], activeMgrs, 'telefone'),
  'lig.radio': D('ligar', l('Ligar para o programador da rádio', 'Call the radio programmer'), 1983, ['sim/sys/radio18', 'pitchRadio18'], pitchRadio18,
    (s) => { const r = rel0(s, (x) => s.week - x.week <= 16)!; return { text: pitchRadio18(s, r.id, fmtsNow18(s)[0], 'self') }; },
    { lock: (s) => (!fmtsNow18(s).length ? none(l('Ainda não há rádio.', 'There is no radio yet.')) : rel0(s, (x) => s.week - x.week <= 16) ? null : none(l('Nenhum disco seu recente para levar.', 'No recent record of yours to pitch.'))),
      hint: (s) => (callCost33(s) ? fx('mais o minuto: {v}', 'plus the minutes: {v}', { v: $(callCost33(s)) }) : null) }),
  'lig.imprensa': G('ligar', l('Imprensa: dar furo ou pedir embargo', 'Press: give a scoop or ask for an embargo'), 1983, ['sim/sys/press18', 'scoop18'], scoop18, 'jornal'),
  'lig.intro': D('ligar', l('Pedir apresentação a um amigo em comum', 'Ask a mutual friend for an introduction'), 1997, ['sim/sys/social31sys', 'askIntro31'], askIntro31,
    (s) => { const t = introTarget(s)!; return err33(askIntro31(s, t), l('Apresentação marcada.', 'Introduction set up.')); },
    { lock: (s) => (introTarget(s) ? null : none(l('Ninguém para apresentar agora.', 'Nobody to introduce now.'))) }),
  'lig.holo': G('ligar', l('Reunião em holograma (sem viajar)', 'Hologram meeting (no travel)'), 2032, ['sim/deleg31', 'respView31'], respView31, 'mesareuniao'),
  // ======================================================== RECADOS
  'rec.ler': D('recados', l('Arquivar', 'Archive'), 1983, ['sim/inbox18', 'archive18'], archive18, (s, _c, k) => { archive18(s, k!); return { text: l('Arquivado.', 'Archived.') }; },
    { items: (s) => inboxItems(s).filter((x) => x.unread).slice(0, 4).map((x) => ({ arg: x.key, title: x.from, sub: x.subject })), group: 'msg' }),
  'rec.estrela': D('recados', l('Marcar', 'Star'), 1983, ['sim/inbox18', 'star18'], star18, (s, _c, k) => { star18(s, k!); return { text: l('Marcado com estrela.', 'Starred.') }; },
    { items: (s) => inboxItems(s).filter((x) => x.unread).slice(0, 4).map((x) => ({ arg: x.key, title: x.from, sub: x.subject })), group: 'msg' }),
  'rec.caixa': G('recados', l('Abrir a caixa inteira', 'Open the whole inbox'), 1983, ['sim/inbox18', 'archive18'], archive18, 'correspondencia'),
  'rec.grupo': G('recados', l('Grupo do elenco (fofoca e briga antes de explodir)', 'Roster group (gossip and fights before they blow up)'), 2009, ['sim/r33/pessoas33', 'ego33'], ego33, 'lounge'),
  'rec.ia': D('recados', l('Assistente responde por você', 'Assistant answers for you'), 2032, ['sim/r33/aparelhos33', 'aiAnswer33'], aiAnswer33, (s) => { const r = aiAnswer33(s); return { text: r.text, bad: !!r.crisis }; },
    { lock: (s) => aiLock33(s), hint: () => l('responde com a resposta padrão; pode errar (8%)', 'uses the default reply; may get it wrong (8%)') }),
  // ======================================================== AGENDA
  'ag.bolinhas': Rd('agenda', l('Bolinhas do mês', 'This month\'s dots'), 1983, ['sim/sys/agenda17', 'balls'], balls, (s) => { const b = balls(s); return [fx('Escritório: {o} · pessoais: {p} · reservadas: {r}', 'Office: {o} · personal: {p} · booked: {r}', { o: b.office.length, p: b.personal.length, r: reserved(s) }), fx('Tempo livre agora: {n}', 'Free time now: {n}', { n: energyLeft(s) })]; }),
  'ag.marcar': G('agenda', l('Marcar ou desmarcar compromisso', 'Book or cancel an appointment'), 1983, ['sim/calendar19', 'calendar19'], calendar19, 'agenda',
    { lines: (s) => calendar19(s, { weeks: 4 }).slice(0, 3).map((d) => d.t) }),
  'ag.rotina': D('agenda', l('Rotina: dormir mais', 'Routine: sleep more'), 2007, ['sim/r33/vida33', 'setRoutine33'], setRoutine33, (s) => { setRoutine33(s, vida33(s).routine === 'sleep' ? undefined : 'sleep'); return { text: vida33(s).routine === 'sleep' ? l('Rotina de sono marcada.', 'Sleep routine set.') : l('Rotina tirada.', 'Routine removed.') }; },
    { sys: on(SW33.rotina) }),
  // ======================================================== TOQUES (1997–2009)
  'toq.vender': D('toques', l('Transformar o hit em toque e vender', 'Turn the hit into a ringtone and sell it'), 1997, ['sim/r33/aparelhos33', 'makeRingtone33'], makeRingtone33,
    (s) => err33(makeRingtone33(s, hit33(s)!), l('O toque está à venda nas operadoras.', 'The ringtone is on sale with the carriers.')),
    { ate: 2009, lock: (s) => { const h = hit33(s); return h ? ringLock33(s, h) : none(l('Nenhum hit seu (top 40) para virar toque.', 'No hit of yours (top 40) to become a ringtone.')); },
      hint: (s) => fx('mercado de toques: {p} do auge', 'ringtone market: {p} of peak', { p: pct(ringLife33(s.year)) }) }),
  'toq.ranking': Rd('toques', l('Ranking de toques', 'Ringtone chart'), 2002, ['sim/r33/formats33', 'formatLife33'], formatLife33,
    (s) => Object.keys(peekAp33(s)?.ring ?? {}).map((id) => s.releases[id]).filter(Boolean).slice(0, 4).map((r) => fx('"{t}" — pico #{p}', '"{t}" — peak #{p}', { t: r.title, p: r.peak })), { ate: 2009 }),
  // ======================================================== JOGO
  'jogo.jogar': { app: 'jogo', label: l('Jogar', 'Play'), de: 1982, src: ['sim/r33/aparelhos33', 'endGame33'], fn: endGame33, kind: 'game', run: () => undefined },
  // ======================================================== RÁDIO
  'rad.ouvir': Rd('radio', l('O que toca nas rádios da cidade', 'What city radio is playing'), 1997, ['sim/sys/radio18', 'fmtsNow18'], fmtsNow18,
    (s) => { const r = rel0(s); return [fx('Formatos no ar: {n}', 'Formats on air: {n}', { n: fmtsNow18(s).length }), r ? fx('"{t}": força na rotação {v}', '"{t}": rotation strength {v}', { t: r.title, v: Math.round(spins18(s, r.id) * 10) / 10 }) : l('Nada seu tocando.', 'Nothing of yours playing.')]; }),
  'rad.pedir': D('radio', l('Pedir para tocar a sua música', 'Ask them to play your song'), 1997, ['sim/sys/radio18', 'pitchRadio18'], pitchRadio18,
    (s) => { const r = rel0(s, (x) => s.week - x.week <= 16)!; return { text: pitchRadio18(s, r.id, fmtsNow18(s)[0], 'self') }; },
    { lock: (s) => (rel0(s, (x) => s.week - x.week <= 16) ? null : none(l('Nenhum disco seu recente para levar.', 'No recent record of yours to pitch.'))) }),
  'rad.almoco': D('radio', l('Almoço com o programador', 'Lunch with the programmer'), 1997, ['sim/sys/radio18', 'lunchPd18'], lunchPd18, (s) => ({ text: lunchPd18(s, station0(s)!) }),
    { lock: (s) => (station0(s) ? null : none(l('Nenhuma rádio na cidade agora.', 'No radio station in town now.'))) }),
  // ======================================================== MÚSICA E STREAMING
  'mus.catalogo': Rd('musica', l('Seu catálogo e as faixas do elenco', 'Your catalogue and the roster\'s tracks'), 2007, ['sim/sys/show27', 'repertoire27'], repertoire27,
    (s) => { const a = act0(s); return a ? [fx('{a}: {n} canções no repertório', '{a}: {n} songs in the repertoire', { a: s.acts[a].name, n: repertoire27(s, s.acts[a]).length })] : [noAct]; }),
  'str.ouvintes': Rd('streaming', l('Ouvintes e retenção', 'Listeners and retention'), 2008, ['sim/sys/stream18', 'retOf18'], retOf18,
    (s) => { const r = rel0(s); return r ? [fx('"{t}": retenção {p}', '"{t}": retention {p}', { t: r.title, p: pct(retOf18(s, r)) })] : [l('Nenhum disco seu no streaming.', 'No record of yours on streaming.')]; }, { sys: () => true }),
  'str.playlist': D('streaming', l('Pedir vaga em playlist', 'Pitch for a playlist slot'), 2008, ['sim/sys/stream18', 'pitchPlaylist18'], pitchPlaylist18, (s) => ({ text: pitchPlaylist18(s, rel0(s)!.id) }),
    { lock: (s) => (rel0(s) ? null : none(l('Nenhum disco seu lançado.', 'No record of yours released.'))) }),
  'str.propria': G('streaming', l('Suas playlists (plataforma própria)', 'Your playlists (own platform)'), 2008, ['sim/sys/car31plat', 'addList31'], addList31, 'car:platform',
    { when: (s) => !!(s.x4 as unknown as { careers12?: { active?: string[] } }).careers12?.active?.includes('platform') }),
  'str.farm': Rd('streaming', l('Risco de streams falsos', 'Fake-stream risk'), 2015, ['sim/sys/stream18', 'farmRisk18'], farmRisk18, (s) => [fx('Chance de pegar fazenda de streams: {p}', 'Chance of a stream farm being caught: {p}', { p: pct(farmRisk18(s, 0)) })]),
  // ======================================================== VÍDEOS (2006+)
  'vid.alta': D('videos', l('Ver vídeos em alta e descobrir artista novo', 'Watch trending videos and find a new artist'), 2006, ['sim/sys/discover18', 'dig18'], dig18,
    (s) => res33(dig18(s, vidCh(s)), l('Vídeos vistos.', 'Videos watched.')),
    { lock: (s) => vidLock(s), hint: (s) => { const c = chNow18(s).find((x) => x.id === vidCh(s)); return c ? fx('{c} · {v} · {b} bolinha', '{c} · {v} · {b} dot', { c: c.name, v: $(chCost18(s, c)), b: c.balls }) : null; } }),
  'vid.olheiro': D('videos', l('Mandar olheiro conferir', 'Send a scout to check'), 2006, ['sim/scouting', 'watchAct'], watchAct, (s, _c, id) => res33(watchAct(s, id!), l('O olheiro vai conferir.', 'The scout will check.')),
    { items: (s) => { const a = leadOf(s); return a && s.acts[a] ? [{ arg: a, title: s.acts[a].name, sub: genreById[s.acts[a].genre]?.name ?? s.acts[a].genre, face: s.acts[a].members[0] }] : []; }, group: 'lead' }),
  'vid.seguir': D('videos', l('Seguir', 'Follow'), 2006, ['sim/sys/scout11', 'toggleWatch'], toggleWatch, (s, _c, id) => ({ text: toggleWatch(s, id!) ? l('Seguindo: avisa quando sair vídeo novo.', 'Following: you hear when a new video drops.') : l('Deixou de seguir.', 'Unfollowed.') }),
    { items: (s) => { const a = leadOf(s); return a && s.acts[a] ? [{ arg: a, title: s.acts[a].name }] : []; }, group: 'lead' }),
  'vid.proposta': { app: 'videos', label: l('Fazer proposta agora', 'Make an offer now'), de: 2006, src: ['sim/contracts', 'defaultOffer'], fn: defaultOffer, kind: 'ui', run: (_s, c, id) => { c.close(); openOffer(id!); },
    items: (s) => { const a = leadOf(s); return a && s.acts[a] ? [{ arg: a, title: s.acts[a].name }] : []; }, group: 'lead',
    hint: (s, id) => { const a = id ? s.acts[id] : undefined; if (!a || a.owner) return null; const e = evaluateOffer(s, a, defaultOffer(s, a)); return fx('chance de aceitar: {p}', 'chance they accept: {p}', { p: pct(e.p ?? 0) }); } },
  'vid.clipes': G('videos', l('Clipes do seu elenco e as views', 'Your roster\'s videos and views'), 2006, ['sim/sys/media18', 'makeVideo18'], makeVideo18, 'quadrobranco',
    { sys: videoOpen18, hint: (s) => fx('coreografia: {v}', 'choreography: {v}', { v: $(choreoFee18(s)) }) }),
  'vid.meme': Rd('videos', l('O meme do momento', 'The meme of the moment'), 2010, ['sim/r33/mundo33', 'pulse33'], pulse33,
    (s) => mundoNow33(s).filter((x) => x.kind === 'meme').slice(0, 2).map((x) => x.label), { sys: memes33On }),
  'vid.derrubar': D('videos', l('Deepfake de voz: derrubar', 'Voice deepfake: take it down'), 2023, ['sim/sys/ai18', 'resolveFake18'], resolveFake18, (s) => ({ text: resolveFake18(s, fakeAct(s)!, 'takedown', R(s)) }),
    { when: (s) => !!fakeAct(s) }),
  'vid.licenciar': D('videos', l('Deepfake de voz: licenciar (embolsar)', 'Voice deepfake: license it (cash in)'), 2023, ['sim/sys/ai18', 'resolveFake18'], resolveFake18, (s) => ({ text: resolveFake18(s, fakeAct(s)!, 'monetize', R(s)) }),
    { when: (s) => !!fakeAct(s) }),
  'vid.clone': D('videos', l('Licenciar um clone oficial da voz', 'License an official voice clone'), 2023, ['sim/sys/ai18', 'licenseClone18'], licenseClone18, (s) => err33(licenseClone18(s, act0(s)!), l('Clone de voz licenciado.', 'Voice clone licensed.')),
    { lock: (s) => { const a = act0(s); return a ? canClone18(s, s.acts[a]) : actLock(s); } }),
  // ======================================================== NOTÍCIAS
  'not.ler': G('noticias', l('Ler notícias e boatos', 'Read news and rumours'), 2003, ['sim/sys/zines19', 'buyable19'], buyable19, 'jornal'),
  'not.critica': G('noticias', l('Crítica de disco', 'Record reviews'), 2003, ['sim/sys/press18', 'review18'], review18, 'jornal', { mark: { area: 'critics' } }),
  'not.crise': Rd('noticias', l('A crise do momento', 'The crisis of the moment'), 2003, ['sim/r33/mundo33', 'mundoNow33'], mundoNow33, (s) => { const xs = mundoNow33(s).filter((x) => x.kind !== 'meme').map((x) => x.label); const c = creditCrisis33(s); return xs.length ? xs.slice(0, 3) : [c ? l('Crédito apertado nos bancos.', 'Tight bank credit.') : l('Nenhuma crise grande agora.', 'No big crisis right now.')]; }),
  'not.comprar': D('noticias', l('Comprar um fanzine ou site de música', 'Buy a fanzine or music site'), 2003, ['sim/sys/zines19', 'buyOutlet19'], buyOutlet19, (s) => err33(buyOutlet19(s, buyable19(s)[0].id), l('O veículo é seu.', 'The outlet is yours.')),
    { lock: (s) => (buyable19(s).length ? null : none(l('Nenhum veículo à venda.', 'No outlet for sale.'))) }),
  // ======================================================== BANCO
  'ban.saldo': Rd('banco', l('Saldo e dívida', 'Balance and debt'), 2007, ['sim/finance', 'balanceSheet'], balanceSheet, (s) => { const b = balanceSheet(s); return [fx('Caixa {c} · dívida {d}', 'Cash {c} · debt {d}', { c: $(s.player.cash), d: $(totalDebt(s)) }), fx('Patrimônio líquido {v}', 'Net worth {v}', { v: $(b.equity ?? 0) })]; }),
  'ban.emprestimo': D('banco', l('Pedir empréstimo', 'Take a loan'), 2010, ['sim/economy', 'takeLoan'], takeLoan, (s) => res33(takeLoan(s), l('Empréstimo na conta.', 'Loan in the account.')),
    { lock: (s) => (s.player.loans.length >= 3 ? none(l('Já tem 3 empréstimos.', 'Already 3 loans.')) : loanOffer(s) ? null : none(l('O banco não oferece crédito agora.', 'The bank offers no credit now.'))),
      hint: (s) => { const o = loanOffer(s); return o ? fx('{v} a {r}% em {m} meses', '{v} at {r}% over {m} months', { v: $(o.amount), r: Math.round(o.rate * 1000) / 10, m: o.months }) : null; } }),
  'ban.garantia': D('banco', l('Dar uma relíquia como garantia', 'Pledge a relic as collateral'), 2010, ['sim/r33/relic33', 'pledge33'], pledge33, (s) => err33(pledge33(s, relic0(s)!, 'bank'), l('Relíquia empenhada no banco.', 'Relic pledged at the bank.')),
    { sys: on('exp33.relics'), lock: (s) => (relic0(s) ? null : none(l('Nenhuma relíquia sua.', 'No relic of yours.'))) }),
  'ban.soltar': D('banco', l('Soltar a garantia', 'Release the collateral'), 2010, ['sim/r33/relic33', 'unpledge33'], unpledge33, (s) => { unpledge33(s, pledged0(s)!); return { text: l('Garantia solta.', 'Collateral released.') }; },
    { sys: on('exp33.relics'), when: (s) => !!pledged0(s) }),
  'ban.seguro': D('banco', l('Seguro do artista-chave', 'Key-artist insurance'), 2010, ['sim/sys/insure19', 'insureKey19'], insureKey19, (s) => err33(insureKey19(s, act0(s)!, 1), l('Apólice contratada.', 'Policy taken out.')), { lock: actLock }),
  // ======================================================== BOLSA
  'bol.cotacoes': Rd('bolsa', l('Cotações do ano', 'This year\'s quotes'), 1995, ['sim/sys/bolsa10', 'listed'], listed, (s) => listed(s).slice(0, 4).map((r) => fx('{n}: {c}', '{n}: {c}', { n: r.name, c: `${change12(r.q) >= 0 ? '+' : ''}${pct(change12(r.q))}` }))),
  'bol.carteira': G('bolsa', l('Comprar e vender ações; quem controla', 'Buy and sell shares; who controls'), 1995, ['sim/sys/bolsa10', 'holdingsOf'], holdingsOf, 'cofrecasa',
    { mark: { area: 'wealth', tab: ['invest10', 'bolsa'] }, hint: (s) => fx('sua parte do selo: {p}', 'your share of the label: {p}', { p: pct(controlShare(s)) }) }),
  'bol.defender': D('bolsa', l('Defender o selo de compra hostil', 'Defend the label from a hostile bid'), 1995, ['sim/sys/bolsa10', 'repelRaider'], repelRaider, (s) => err33(repelRaider(s, raiders(s).find((r) => r.hostile)!.k), l('Bloco recomprado.', 'Block bought back.')),
    { when: (s) => raiders(s).some((r) => r.hostile) }),
  // ======================================================== COMPRAS
  'com.comprar': D('compras', l('Comprar', 'Buy'), 1889, ['sim/r31/decoshop31', 'orderDeco31'], orderDeco31, (s, _c, id) => res33(orderDeco31(s, id!, via33(s), SHOP_TO33), l('Pedido feito.', 'Order placed.')),
    { items: catItems33, group: 'peca', lock: (s) => (remoteOpen31(s, via33(s)) ? null : none(fx('{n} só a partir de 1900.', '{n} only from 1900.', { n: remoteName31('mail', s.year) }))) }),
  'com.vintage': G('compras', l('Peças antigas (antiquário)', 'Vintage pieces (antique shop)'), 1889, ['sim/r31/decoshop31', 'vintage31'], vintage31, 'cidade'),
  'com.arrumar': G('compras', l('Escolher onde colocar (Arrumar)', 'Choose where it goes (Arrange)'), 1889, ['sim/r31/decoshop31', 'orderDeco31'], orderDeco31, 'sede'),
  'com.gear': G('compras', l('Instrumentos e equipamento', 'Instruments and gear'), 1995, ['sim/sys/gear19', 'gearNow19'], gearNow19, 'loja'),
  // ======================================================== LEILÃO
  'lei.sessoes': Rd('leilao', l('Sessões e lotes', 'Sales and lots'), 2003, ['sim/sys/auction31', 'openSessions31'], openSessions31, (s) => { const xs = openSessions31(s); return xs.length ? [fx('{n} pregão(ões) aberto(s)', '{n} sale(s) open', { n: xs.length })] : [l('Nenhum pregão aberto.', 'No sale open.')]; }),
  'lei.lance': D('leilao', l('Dar lance', 'Bid'), 2003, ['sim/sys/bauc31', 'writeBid31'], writeBid31, (s, _c, id) => { const lot = sheet31(s)!.lots.find((x) => x.id === id)!; return err33(writeBid31(s, id!, top31(s, lot).need), l('Lance escrito na folha.', 'Bid written on the sheet.')); },
    { items: bidLots33, group: 'lote', sys: baucOn31, lock: (s, id) => { const lot = sheet31(s)?.lots.find((x) => x.id === id); return lot ? bidLock31(s, id!, top31(s, lot).need) : none(l('Sem folha de lances.', 'No bid sheet.')); } }),
  'lei.vender': G('leilao', l('Vender relíquia ou merch exclusivo', 'Sell a relic or exclusive merch'), 2003, ['sim/r31/relic31', 'noteSale31'], noteSale31, 'leiloes'),
  // ======================================================== INGRESSOS (2012+)
  'ing.shows': Rd('ingressos', l('Shows da semana na cidade', 'This week\'s shows in town'), 2012, ['sim/sys/discover18', 'showsNow18'], showsNow18, (s) => showsNow18(s).slice(0, 3).map((a) => l(a.name, a.name))),
  'ing.ver': D('ingressos', l('Ir ao show para ver quem abre', 'Go to the show to see the opener'), 2012, ['sim/sys/discover18', 'watchShow18'], watchShow18, (s) => res33(watchShow18(s, showsNow18(s)[0].id), l('Show visto.', 'Show seen.')),
    { lock: (s) => (showsNow18(s).length ? null : none(l('Nenhum show grande nesta semana.', 'No big show this week.'))) }),
  'ing.vender': G('ingressos', l('Vender ingressos dos seus shows', 'Sell tickets to your shows'), 2012, ['sim/tours', 'tourList'], tourList, 'palco',
    { hint: (s) => { const a = act0(s); return a ? fx('choque de preço a 1,5×: lealdade −{v}', 'price shock at 1.5×: loyalty −{v}', { v: Math.round(peekShock(s, a) * 10) / 10 }) : null; } }),
  'ing.dinamico': D('ingressos', l('Preço dinâmico (mais dinheiro, fã irritado)', 'Dynamic pricing (more money, angry fans)'), 2012, ['sim/sys/clash17', 'setTix'], setTix, (s) => { setTix(s, act0(s)!, 'dynamic'); return { text: l('Preço dinâmico ligado: +22% de bilheteria, fãs reclamam.', 'Dynamic pricing on: +22% box office, fans complain.') }; },
    { lock: actLock, hint: (s) => { const a = act0(s); const v = a ? peekScalp(s, a) : 0; return v ? fx('cambistas já levaram {v}', 'scalpers already took {v}', { v: $(v) }) : null; } }),
  'ing.nominal': D('ingressos', l('Ingresso nominal contra cambista', 'Named tickets against scalpers'), 2012, ['sim/sys/clash17', 'setTix'], setTix, (s) => { setTix(s, act0(s)!, 'paperless'); return { text: l('Ingresso nominal: cambista some, fila maior.', 'Named tickets: scalpers vanish, longer lines.') }; }, { lock: actLock }),
  // ======================================================== MAPA
  'map.ir': { app: 'mapa', label: l('Ir até um lugar da cidade', 'Go to a place in town'), de: 2007, src: ['ui/r31/nav5', 'travelGo5'], fn: travelGo5, kind: 'go', run: (_s, c) => { c.travel('cidade'); } },
  'map.voos': G('mapa', l('Transporte e partidas do aeroporto', 'Transport and airport departures'), 2007, ['sim/sys/travel31', 'departures31'], departures31, 'aeroporto', { lines: (s) => departures31(s, 4).slice(0, 2).map((f) => fx('{a} → {c}', '{a} → {c}', { a: s.acts[f.act]?.name ?? '', c: f.city })) }),
  'map.bairro': Rd('mapa', l('Bairro em que o preço sobe', 'District where prices are rising'), 2012, ['sim/r33/cidade33', 'districtStage33'], districtStage33, (s) => { const d = districtStage33(s.config.homeCity, s.year); return [fx('Estágio do bairro: {s} (há {a} anos)', 'District stage: {s} ({a} years in)', { s: d.stage, a: d.age })]; }),
  // ======================================================== CÂMERA
  'cam.paparazzi': Rd('camera', l('Flagra de paparazzi', 'Paparazzi shots'), 2007, ['sim/r33/vida33', 'papChance33'], papChance33, (s) => [fx('Chance de flagra este mês: {p}', 'Chance of a shot this month: {p}', { p: pct(papChance33(s, 0)) })], { sys: on(SW33.paparazzi) }),
  'cam.seguranca': D('camera', l('Montar segurança', 'Hire security'), 2007, ['sim/r33/vida33', 'setGuard33'], setGuard33, (s) => { setGuard33(s, vida33(s).guard + 1); return { text: l('Segurança reforçada.', 'Security stepped up.') }; }, { sys: on(SW33.paparazzi), when: (s) => vida33(s).guard < 2 }),
  'cam.muro': D('camera', l('Levantar o muro', 'Build the wall'), 2007, ['sim/r33/vida33', 'buildWall33'], buildWall33, (s) => err33(buildWall33(s), l('Muro levantado.', 'Wall built.')), { sys: on(SW33.paparazzi) }),
  // ======================================================== ENCONTROS
  'enc.passar': D('encontros', l('Passar', 'Pass'), 1996, ['sim/sys/amor31', 'askLock31'], askLock31, (s, _c, k) => { swipe33(s, k!, 'x'); return { text: l('Passou.', 'Passed.') }; }, { items: profiles33, group: 'perfil', one: true }),
  'enc.super': D('encontros', l('Super curtida', 'Super like'), 1996, ['sim/sys/amor31', 'askOdds31'], askOdds31, (s, _c, k) => { swipe33(s, k!, 's'); const m = matchOf33(s, k!, true); return { text: m.ok ? l('Deu match! Agora é chamar para sair.', 'It\'s a match! Now ask them out.') : l('Sem match desta vez.', 'No match this time.') }; },
    { items: profiles33, group: 'perfil', one: true, hint: (s, k) => (k ? fx('chance: {p}', 'chance: {p}', { p: pct(matchOf33(s, k, true).p) }) : null) }),
  'enc.curtir': D('encontros', l('Curtir', 'Like'), 1996, ['sim/sys/amor31', 'askRoll31'], askRoll31, (s, _c, k) => { swipe33(s, k!, 'l'); const m = matchOf33(s, k!); return { text: m.ok ? l('Deu match! Agora é chamar para sair.', 'It\'s a match! Now ask them out.') : l('Sem match desta vez.', 'No match this time.') }; },
    { items: profiles33, group: 'perfil', one: true, hint: (s, k) => (k ? fx('chance: {p} · amigos em comum: {n}', 'chance: {p} · mutual friends: {n}', { p: pct(matchOf33(s, k).p), n: introVia31(s, k) ? 1 : 0 }) : null) }),
  'enc.sair': D('encontros', l('Chamar para sair (1 bolinha)', 'Ask out (1 dot)'), 1996, ['sim/sys/amor31', 'askOut31'], askOut31, (s, _c, k) => res33(askOut31(s, k!), l('Encontro marcado.', 'Date set.')),
    { items: (s) => matches33(s), group: 'match', lock: (s, k) => (k ? askLock31(s, k) : null), hint: (s) => encKind(s) }),
  // ======================================================== FAMÍLIA (1997+)
  'fam.almoco': D('familia', l('Almoço de domingo com a Lucia', 'Sunday lunch with Lucia'), 1997, ['sim/sys/fossati31', 'luciaLunch31'], luciaLunch31, (s) => res33(luciaLunch31(s), l('Almoço em família.', 'Family lunch.')), { lock: (s) => famLock31(s, 'lunch') }),
  'fam.lasanha': D('familia', l('Lasanha da Lucia de presente', 'Lucia\'s lasagna as a gift'), 1997, ['sim/sys/fossati31', 'lasagna31'], lasagna31, (s) => res33(lasagna31(s, giftKey(s)!), l('Presente entregue.', 'Gift delivered.')), { lock: (s) => famLock31(s, 'lasagna') ?? (giftKey(s) ? null : none(l('Ninguém para presentear.', 'Nobody to give it to.'))) }),
  'fam.sonia': D('familia', l('Evento com a Sonia', 'Promo event with Sonia'), 1997, ['sim/sys/fossati31', 'soniaPromo31'], soniaPromo31, (s) => res33(soniaPromo31(s, act0(s)!), l('Evento feito.', 'Event done.')), { lock: (s) => (act0(s) ? famLock31(s, 'promo', act0(s)) : actLock(s)) }),
  'fam.antonella': D('familia', l('Matéria com a Antonella', 'Story with Antonella'), 1997, ['sim/sys/fossati31', 'antonellaPress31'], antonellaPress31, (s) => res33(antonellaPress31(s, act0(s)!), l('Matéria feita.', 'Story done.')), { lock: (s) => (act0(s) ? famLock31(s, 'press', act0(s)) : actLock(s)) }),
  'fam.quem': Rd('familia', l('A família agora', 'The family now'), 1997, ['sim/sys/fossati31', 'famNow31'], famNow31, (s) => famNow31(s).slice(0, 5).map((m) => fx('{n}, {a}', '{n}, {a}', { n: m.m.name, a: m.age }))),
  'fam.herdeiros': Rd('familia', l('Herdeiros e sucessão', 'Heirs and succession'), 1997, ['sim/sys/heirs8', 'heirCandidates'], heirCandidates, (s) => heirCandidates(s).slice(0, 3).map((c) => { const p = inheritancePreview(s, c, 'retire'); return fx('{n}: herda {v}', '{n}: inherits {v}', { n: c.name, v: $(p.wealth) }); })),
  // ======================================================== IMÓVEIS (2012+)
  'imo.comprar': D('imoveis', l('Comprar', 'Buy'), 2012, ['sim/sys/lots31', 'buyLot31'], buyLot31, (s, _c, id) => res33(buyLot31(s, Number(id)), l('Terreno comprado.', 'Plot bought.')), { items: lots33, group: 'lote', lock: (s, id) => (id ? lotLock31(s, Number(id)) : null) }),
  'imo.valor': Rd('imoveis', l('Valor dos seus terrenos e vizinhos', 'Value of your plots and neighbours'), 2012, ['sim/r33/cidade33', 'lotValue33'], lotValue33,
    (s) => ownLots(s).slice(0, 3).map((n) => { const nb = neighbourOf33(s, n); return fx('{t}: {v}{x}', '{t}: {v}{x}', { t: LOTS18[n]?.name ?? '', v: $(lotValue33(s, n)), x: nb ? ` · ${nb.name}` : '' }); }), { sys: on('exp33.cidade.terrenos') }),
  'imo.loja': D('imoveis', l('Abrir loja própria', 'Open your own shop'), 2012, ['sim/r33/cidade33', 'openShop33'], openShop33, (s) => res33(openShop33(s, ownLots(s)[0]), l('Loja aberta.', 'Shop opened.')),
    { sys: on('exp33.cidade.lojas'), lock: (s) => (ownLots(s).length ? shopLock33(s, ownLots(s)[0]) : none(l('Compre um terreno antes.', 'Buy a plot first.'))) }),
  // ======================================================== SAÚDE (2014+)
  'sau.ver': Rd('saude', l('Estresse, saúde e sono', 'Stress, health and sleep'), 2014, ['sim/r33/vida33', 'stressDot33'], stressDot33, (s) => { const o = ownerOf(s); return [fx('Estresse {e} · saúde {h}', 'Stress {e} · health {h}', { e: Math.round(o.stress), h: Math.round(o.health) }), stressDot33(s) ? l('O estresse está tirando 1 bolinha por mês.', 'Stress is costing 1 dot a month.') : frail33(s) > 0 ? l('Saúde baixa atrapalha a gravação.', 'Low health is hurting recording.') : l('Tudo em ordem.', 'All fine.')]; }),
  'sau.medico': D('saude', l('Marcar médico (check-up)', 'Book a doctor (check-up)'), 2014, ['sim/r33/vida33', 'treatOwner33'], treatOwner33, (s) => err33(treatOwner33(s, 'checkup'), l('Check-up feito.', 'Check-up done.')), { sys: on(SW33.saude) }),
  'sau.reab': D('saude', l('Reabilitação', 'Rehab'), 2014, ['sim/r33/vida33', 'treatOwner33'], treatOwner33, (s) => err33(treatOwner33(s, 'rehab'), l('Internação marcada.', 'Rehab booked.')), { sys: on(SW33.saude) }),
  'sau.doar': D('saude', l('Doar US$ 1 mil', 'Donate US$ 1k'), 2014, ['sim/r33/vida33', 'donate33'], donate33, (s) => err33(donate33(s, 1000), l('Doação feita.', 'Donation made.')), { sys: on(SW33.rep) }),
  'sau.fundacao': D('saude', l('Abrir fundação', 'Open a foundation'), 2014, ['sim/r33/vida33', 'foundFoundation33'], foundFoundation33, (s) => err33(foundFoundation33(s), l('Fundação aberta.', 'Foundation opened.')), { sys: on(SW33.rep) }),
  // ======================================================== FÃ-CLUBE (celular 2007+; site no PC 1995+)
  'fan.motivos': Rd('faclube', l('Motivos e facções dos fãs', 'Fan motives and factions'), 1995, ['sim/sys/fans18', 'factions18'], factions18, (s) => { const a = act0(s); if (!a || !fans18(s).a[a]) return [l('Sem base de fãs medida ainda.', 'No measured fan base yet.')]; const f = factions18(s, s.acts[a]); return [fx('{a}: puristas {p} · mainstream {m} · colecionadores {c} · comunidade {k}', '{a}: purists {p} · mainstream {m} · collectors {c} · community {k}', { a: s.acts[a].name, p: pct(f.purist), m: pct(f.main), c: pct(f.coll), k: pct(f.comm) })]; }),
  'fan.equipe': D('faclube', l('Equipe de rua do fã-clube', 'Fan-club street team'), 1995, ['sim/sys/fans18', 'setTeam18'], setTeam18, (s) => err33(setTeam18(s, act0(s)!, true), l('Equipe de rua montada.', 'Street team set up.')), { lock: actLock }),
  'fan.merch': G('faclube', l('Merch: lote, licença, pirata', 'Merch: batch, license, bootleg'), 1995, ['sim/sys/merch17', 'makeBatch'], makeBatch, 'mural'),
  'fan.assinar': D('faclube', l('Abrir assinatura de fãs', 'Open a fan subscription'), 2013, ['sim/r33/aparelhos33', 'setFanSub33'], setFanSub33, (s) => err33(setFanSub33(s, act0(s)!, true), l('Assinatura aberta: renda pequena todo mês.', 'Subscription open: small income every month.')),
    { when: (s) => !!act0(s) && peekAp33(s)?.sub[act0(s)!] === undefined, lock: (s) => subLock33(s, act0(s)!), hint: (s) => fx('renda estimada: {v}/mês', 'estimated income: {v}/month', { v: $(subIncome33(s, act0(s)!)) }) }),
  'fan.cancelar': D('faclube', l('Fechar a assinatura', 'Close the subscription'), 2013, ['sim/r33/aparelhos33', 'setFanSub33'], setFanSub33, (s) => err33(setFanSub33(s, act0(s)!, false), l('Assinatura fechada.', 'Subscription closed.')),
    { when: (s) => !!act0(s) && peekAp33(s)?.sub[act0(s)!] !== undefined }),
  // ======================================================== ASSISTENTE (2032+)
  'ass.responder': D('assistente', l('Responder a caixa por mim', 'Answer the inbox for me'), 2032, ['sim/r33/aparelhos33', 'aiAnswer33'], aiAnswer33, (s) => { const r = aiAnswer33(s); return { text: r.text, bad: !!r.crisis }; }, { lock: aiLock33 }),
  'ass.agenda': G('assistente', l('Agendar por mim', 'Schedule for me'), 2032, ['sim/sys/agenda17', 'ag17'], ag17, 'agenda'),
  // ======================================================== COMPUTADOR
  'pla.caixa': Rd('planilha', l('Livro-caixa', 'Ledger'), 1982, ['sim/finance', 'balanceSheet'], balanceSheet, (s) => [fx('Caixa {c} · dívida {d}', 'Cash {c} · debt {d}', { c: $(s.player.cash), d: $(totalDebt(s)) })], { dev: 'pc' }),
  'pla.previsao': Rd('planilha', l('Previsão de vendas com os aprendizados', 'Sales forecast from the learnings'), 1982, ['sim/r33/learn33', 'calib33'], calib33,
    (s) => { const xs: L[] = lessons31(s).slice(0, 2).map((x) => fx('{n}: {d}', '{n}: {d}', { n: x.name, d: `${x.diff >= 0 ? '+' : ''}${pct(x.diff)}` })); if (s.year >= 2032 && act0(s)) xs.unshift(fx('Margem da previsão: ±{p}', 'Forecast margin: ±{p}', { p: pct(learnWidth33(s, s.acts[act0(s)!], 'lp')) })); return xs.length ? xs : [l('Sem aprendizados ainda: lance discos para a planilha aprender.', 'No learnings yet: release records so the spreadsheet can learn.')]; }, { dev: 'pc' }),
  'pla.abrir': G('planilha', l('Abrir o livro-caixa inteiro', 'Open the whole ledger'), 1982, ['sim/finance', 'balanceSheet'], balanceSheet, 'livrocaixa', { dev: 'pc' }),
  'con.pacotes': G('contratos', l('Pacotes e cláusulas', 'Packages and clauses'), 1982, ['sim/sys/contracts18', 'clausesOf'], clausesOf, 'arquivoaco', { dev: 'pc' }),
  'con.direitos': G('contratos', l('Direitos e sociedades', 'Rights and partnerships'), 1982, ['sim/sys/rights18', 'socOptions18'], socOptions18, 'arquivoaco', { dev: 'pc', mark: { area: 'rights18' } }),
  'con.sample': D('contratos', l('Liberar pedido de sample', 'Clear a sample request'), 1982, ['sim/r33/sample33', 'answerReq33'], answerReq33, (s) => ({ text: answerReq33(s, sampleReq(s)!, true) }), { dev: 'pc', sys: on('exp33.sampling'), when: (s) => !!sampleReq(s) }),
  'con.processo': D('contratos', l('Fazer acordo no processo', 'Settle the lawsuit'), 1982, ['sim/r33/sample33', 'resolveCase33'], resolveCase33, (s) => ({ text: resolveCase33(s, sampleCase(s)!, 'settle') }), { dev: 'pc', sys: on('exp33.sampling'), when: (s) => !!sampleCase(s) }),
  'rel.diretores': G('relatorios', l('Relatórios dos diretores e delegação', 'Directors\' reports and delegation'), 1982, ['sim/deleg31', 'setMode31'], setMode31, 'chefe', { dev: 'pc' }),
  'rel.imprensa': Rd('relatorios', l('Diretor de imprensa, jurídico e RH', 'Press, legal and HR directors'), 1982, ['sim/r33/dir33', 'pressPick33'], pressPick33, () => [l('Os três respondem pelos cartões e salas de crise quando o cargo está delegado.', 'All three answer the cards and crisis rooms when the post is delegated.')], { dev: 'pc', sys: on('exp33.dir') }),
  'ema.caixa': G('email', l('Abrir a caixa de entrada', 'Open the inbox'), 1995, ['sim/inbox18', 'star18'], star18, 'correspondencia', { dev: 'pc' }),
  'edi.demo': D('editor', l('Gravar demo caseira (1 bolinha)', 'Record a home demo (1 dot)'), 1995, ['sim/r33/aparelhos33', 'homeDemo33'], homeDemo33, (s) => { const r = homeDemo33(s, act0(s)!); return { text: r.text, bad: !r.ok }; },
    { dev: 'pc', lock: (s) => actLock(s) ?? (energyLeft(s) < 1 ? lock31(l('Sem tempo livre este mês.', 'No free time this month.'), UNLOCK31.time) : null), hint: () => l('custo zero, qualidade baixa: boa para testar', 'zero cost, low quality: good for testing') }),
  'edi.radio': D('editor', l('Mandar à rádio', 'Send to radio'), 1995, ['sim/sys/radio18', 'pitchRadio18'], pitchRadio18, (s) => { const r = rel0(s, (x) => s.week - x.week <= 16)!; return { text: pitchRadio18(s, r.id, fmtsNow18(s)[0], 'self') }; },
    { dev: 'pc', lock: (s) => (rel0(s, (x) => s.week - x.week <= 16) && fmtsNow18(s).length ? null : none(l('Nenhum disco seu recente para levar.', 'No recent record of yours to pitch.'))) }),
  'for.perda': Rd('forum', l('Quanto se perde com pirataria', 'How much piracy costs you'), 1999, ['sim/r31/vitrine31', 'pirateLoss31'], pirateLoss31, (s) => [fx('Perdido até agora: {v} · cópias circulando: {n}', 'Lost so far: {v} · copies circulating: {n}', { v: $(pirTotal33(s)), n: pirItems33(s).length })], { dev: 'pc', ate: 2010 }),
  'for.denunciar': D('forum', l('Denunciar no cartório (processo)', 'Report at the registry (lawsuit)'), 1999, ['sim/r33/aparelhos33', 'reportPiracy33'], reportPiracy33, (s) => ({ text: reportPiracy33(s) }), { dev: 'pc', ate: 2010, lock: pirLock33, hint: (s) => fx('custas {v}', 'costs {v}', { v: $(money(s, 800)) }) }),
  'for.processar': D('forum', l('Brigar no processo de pirataria', 'Fight the piracy case'), 1999, ['sim/r33/aparelhos33', 'resolvePiracy33'], resolvePiracy33, (s) => ({ text: resolvePiracy33(s, openPir(s)!) }), { dev: 'pc', ate: 2010, when: (s) => !!openPir(s) }),
  'for.vazou': D('forum', l('O disco vazou: lançar às pressas', 'The record leaked: rush it'), 1999, ['sim/r33/aparelhos33', 'leakChoice33'], leakChoice33, (s) => ({ text: leakChoice33(s, pendRel(s)!.id, 'rush') }), { dev: 'pc', ate: 2010, when: (s) => !!pendRel(s) && leakedNow(s) }),
  'dem.myspace': D('demos', l('Perfis com 4 músicas', '4-song profiles'), 2003, ['sim/sys/discover18', 'dig18'], dig18, (s) => res33(dig18(s, 'myspace'), l('Perfis ouvidos.', 'Profiles heard.')), { dev: 'pc', ate: 2010, lock: (s) => chLock(s, 'myspace') }),
  'dem.soundcloud': D('demos', l('Produtores de quarto (rap e eletrônica)', 'Bedroom producers (rap and electronic)'), 2009, ['sim/sys/discover18', 'dig18'], dig18, (s) => res33(dig18(s, 'soundcloud'), l('Faixas ouvidas.', 'Tracks heard.')), { dev: 'pc', lock: (s) => chLock(s, 'soundcloud') }),
  'loj.vender': G('loja', l('Vender CD, vinil e merch direto ao fã', 'Sell CDs, vinyl and merch direct to fans'), 2003, ['sim/sys/merch17', 'canSell'], canSell, 'mural', { dev: 'pc', hint: (s) => { const a = act0(s); const w = a ? canSell(s, s.acts[a]) : noAct; return w ?? null; } }),
  'pai.turne': G('painel', l('Ouvintes por cidade: montar turnê por aqui', 'Listeners by city: plan a tour here'), 2012, ['sim/tours', 'cityDemand'], cityDemand, 'palco',
    { dev: 'pc', lines: (s) => { const a = act0(s); return a ? [fx('Demanda em {c}: {v}', 'Demand in {c}: {v}', { c: s.config.homeCity, v: Math.round(cityDemand(s, s.acts[a], s.config.homeCity)) })] : [noAct]; } }),
  'pai.playlist': D('painel', l('Pedir playlist', 'Pitch a playlist'), 2012, ['sim/sys/stream18', 'pitchPlaylist18'], pitchPlaylist18, (s) => ({ text: pitchPlaylist18(s, rel0(s)!.id) }), { dev: 'pc', lock: (s) => (rel0(s) ? null : none(l('Nenhum disco seu lançado.', 'No record of yours released.'))) }),
  'anu.campanha': G('anuncios', l('Campanha e anúncios por cidade', 'Campaigns and ads by city'), 2012, ['sim/sys/adsync19', 'takeAd19'], takeAd19, 'radiotv', { dev: 'pc' }),
  'ia.demo': D('ia', l('Demo gerada por IA', 'AI-generated demo'), 2030, ['sim/sys/ai18', 'setAiMode18'], setAiMode18, (s) => err33(setAiMode18(s, act0(s)!, 'gen'), l('O artista passa a gravar com a IA gerando a base.', 'The act now records with AI generating the backing.')),
    { dev: 'pc', lock: actLock, hint: (s) => fx('plataforma: {n} (detecção {p})', 'platform: {n} (detection {p})', { n: platformPolicy18(s).name, p: pct(platformPolicy18(s).detect) }) }),
};
// filtros e alvos padrão (o padrão da página antiga: 1º item elegível)
function hit33(s: GameState): string | undefined { return Object.values(s.releases).filter((r) => r.owner === 'player' && r.peak > 0 && r.peak <= 40 && peekAp33(s)?.ring[r.id] === undefined).sort((a, b) => a.peak - b.peak)[0]?.id; }
function introTarget(s: GameState): string | undefined { for (const it of profiles33(s).slice(0, 12)) if (introVia31(s, it.arg)) return it.arg; return undefined; }
function station0(s: GameState): string | undefined { const st = (s.x4 as unknown as { radio18?: { st?: { id: string; own?: string; city?: string }[] } }).radio18?.st ?? []; return st.find((x) => !x.own && stationCity18(s, x as never) === s.config.homeCity)?.id ?? st.find((x) => !x.own)?.id; }
function vidCh(s: GameState): string { return s.year >= 2018 ? 'tiktok' : 'youtube'; }
function chLock(s: GameState, id: string): Lock31 | L | null {
  const c = chNow18(s).find((x) => x.id === id);
  if (!c) return none(l('Canal indisponível nesta época.', 'Channel not available in this era.'));
  if ((disc18(s).last[c.id] ?? -99) > s.week - 4) return lock31(l('Você já usou este canal neste mês.', 'You already used this channel this month.'), UNLOCK31.time);
  if (energyLeft(s) < c.balls) return lock31(l('Sem tempo livre este mês.', 'No free time this month.'), UNLOCK31.time);
  return null;
}
function vidLock(s: GameState): Lock31 | L | null { return chLock(s, vidCh(s)); }
function relic0(s: GameState): string | undefined { const x = (s as unknown as { relics?: Record<string, { owner?: string }> }).relics ?? {}; return Object.keys(x).find((id) => x[id]?.owner === 'player'); }
function pledged0(s: GameState): string | undefined { const x = (s.x4 as unknown as { cat33?: { pledge?: Record<string, unknown> } }).cat33?.pledge ?? {}; return Object.keys(x)[0]; }
function giftKey(s: GameState): string | undefined { const a = act0(s); const p = a ? s.acts[a].members[0] : undefined; return p ? `p:${p}` : undefined; }
function ownLots(s: GameState): number[] { const o = (s.x4 as unknown as { lots31?: { own?: Record<string, unknown> } }).lots31?.own ?? {}; return Object.keys(o).map(Number); }
function sampleReq(s: GameState): string | undefined { const st = (s.x4 as unknown as { cat33?: { req?: { id: string; st?: string }[] } }).cat33?.req ?? []; return st.find((x) => !x.st || x.st === 'open')?.id; }
function sampleCase(s: GameState): string | undefined { const st = (s.x4 as unknown as { cat33?: { req?: { id: string; st?: string }[] } }).cat33?.req ?? []; return st.find((x) => x.st === 'case')?.id; }
function openPir(s: GameState): string | undefined { return (peekAp33(s)?.pir ?? []).find((c) => !c.done)?.id; }
function leakedNow(s: GameState): boolean { return s.decisions.some((d) => d.eventId === 'ap33_leak'); }
function matches33(s: GameState): Item33[] {
  const st = peekAp33(s);
  if (!st) return [];
  return Object.entries(st.swipe).filter(([k, [v]]) => v !== 'x' && matchOf33(s, k, v === 's').ok && s.persons[k.slice(2)] && !isFossati31(s, k)).slice(0, 3)
    .map(([k]) => ({ arg: k, title: s.persons[k.slice(2)].name, face: k.slice(2) }));
}
function peekShock(s: GameState, actId: string): number {
  const f = (s.x4 as unknown as { fans18?: { a?: Record<string, { loy: number }> } }).fans18?.a?.[actId];
  if (!f) return 0;
  const keep = f.loy;
  try { ticketShock18(s, s.acts[actId], 1.5); return keep - f.loy; } finally { f.loy = keep; }
}
function peekScalp(s: GameState, actId: string): number { return ((s.x4 as unknown as { cal17?: { scalp?: Record<string, number> } }).cal17?.scalp ?? {})[actId] ?? 0; }
void cal17; void toggleFight; void toggleLicense; void unitPrice; void dropList31; void st18; void embargo18; void addHype; void playerPerson; void pendingList;

export const APPS33: Record<string, AppDef33> = A;
export const ACTS33: Record<string, ActDef33> = C;

// ---------------------------------------------------------------- gancho de registro (outras frentes)

export interface AppReg33 extends AppDef33 {
  /** versões do aparelho em que o app aparece (ausente = as da tabela; app novo fora da tabela vai para o fim) */
  vers?: number[];
}
const EXTRA33: Record<Dev33, Map<string, AppReg33>> = { phone: new Map(), pc: new Map() };
/** REDES33 e outras frentes: põe um app no celular (substitui pelo id; 'redes' já tem lugar reservado na tabela). */
export function registerPhoneApp33(a: AppReg33): void { EXTRA33.phone.set(a.id, a); }
/** O mesmo para o computador. */
export function registerPcApp33(a: AppReg33): void { EXTRA33.pc.set(a.id, a); }
/** Ações extras de um app de fora (entram no catálogo e seguem as mesmas regras). */
export function registerAct33(id: string, a: ActDef33): void { C[id] = a; }
export const extraApps33 = (d: Dev33): AppReg33[] => [...EXTRA33[d].values()];
/** Apps que só existem pelo gancho (reservados na tabela): sem registro, não aparecem. */
export const RESERVED33 = new Set(['redes']);

// ---------------------------------------------------------------- leitura (o que a tela mostra)

/** Definição do app (a de fora ganha da do catálogo). */
export const appOf33 = (d: Dev33, id: string): AppDef33 | undefined => EXTRA33[d].get(id) ?? (RESERVED33.has(id) ? undefined : A[id]);
const yearOk = (y: number, de?: number, ate?: number) => (de === undefined || y >= de) && (ate === undefined || y <= ate);

/** Ações de um app neste ano e aparelho (sistema desligado = some; `when` falso = some). */
export function actsOf33(s: GameState, d: Dev33, app: string): string[] {
  return Object.keys(C).filter((id) => {
    const a = C[id];
    if (a.app !== app || (a.dev && a.dev !== d) || !yearOk(s.year, a.de, a.ate)) return false;
    try { if (a.sys && !a.sys(s)) return false; if (a.when && !a.when(s)) return false; } catch { return false; }
    return true;
  });
}
/** Apps visíveis no aparelho agora (versão do ano, anos do app, sistema ligado, e pelo menos uma ação ou tela própria). */
export function apps33(s: GameState, d: Dev33): string[] {
  if (!ap33On(s)) return [];
  const v = d === 'phone' ? phoneVer(s.year) : pcVer(s.year);
  if (v === undefined) return [];
  const base = appTable33(d)[v] ?? [];
  const extra = extraApps33(d).filter((a) => !base.includes(a.id) && (!a.vers || a.vers.includes(v))).map((a) => a.id);
  return [...base, ...extra].filter((id) => {
    const a = appOf33(d, id);
    if (!a) return false;
    const r = EXTRA33[d].get(id);
    if (r?.vers && !r.vers.includes(v)) return false;
    if (!yearOk(s.year, a.de, a.ate)) return false;
    try { if (a.sys && !a.sys(s)) return false; } catch { return false; }
    return !!a.open || actsOf33(s, d, id).length > 0;
  });
}
export const appName33 = (s: GameState, d: Dev33, id: string): L => { const a = appOf33(d, id); return !a ? l(id, id) : typeof a.name === 'function' ? a.name(s, d) : a.name; };
/** "!" do app e do aparelho (soma dos apps visíveis). */
export function appBang33(s: GameState, d: Dev33, id: string): number { try { return appOf33(d, id)?.bang?.(s) ?? 0; } catch { return 0; } }
export function devBang33(s: GameState, d: Dev33): number { return apps33(s, d).reduce((t, id) => t + appBang33(s, d, id), 0); }
/** Bloqueio de uma ação (a mesma trava da função de hoje). */
export function lock33(s: GameState, id: string, arg?: string): Lock31 | L | null {
  const a = C[id];
  try { return a?.lock?.(s, arg) ?? null; } catch { return null; }
}
export const why33 = (x: Lock31 | L | null | undefined): L | null => (!x ? null : 'why' in (x as object) ? (x as Lock31).why : (x as L));
void money;
