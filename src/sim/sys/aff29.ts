// Rodada 29 (Submundo) — FACÇÕES × GÊNEROS E CENAS. Pedido do autor: "veja como conectar facções a certos artistas,
// gêneros e movimentos, como o Comando Vermelho com o funk proibidão".
//
// Nível CULTURAL (afinidade organização ↔ gênero/cena, com época e região). Datas reais só onde são bem documentadas;
// o resto tem corte de época razoável. Organizações especulativas são INVENTADAS (data/cyber29: STREET29).
//
// Efeitos (todos pelos sistemas de sempre, sobre o que é SEU — o mundo sem você fica igual):
//  • um ato seu do gênero/cena no território recebe a família: convite para o baile/evento (cachê, fama, divulgação
//    de rua; batida policial → cena; pânico moral → escândalo), "pedágio" para tocar, pressão para escrever sobre eles
//    (laço de rua da partida: credibilidade, rixas, censura) — pedidos do mob29 com prazo;
//  • movimento (movements9) de um gênero ligado a uma facção, no território dela e com ato seu dentro: cresce mais
//    rápido, mas carrega estigma (escândalo de vez em quando);
//  • a cena aparece no card da organização e na ficha do gênero/cena (sceneAff29).
//
// REGRA DE SEGURANÇA (pessoas reais): afinidade é de GÊNERO e CENA, nunca de pessoa. Nenhuma pessoa real viva aparece
// como membro/associada de facção real sem registro público (os laços documentados do orgs17, rotulados "ligação
// documentada"). Laço simulado só nasce de jogada desta partida (o seu ato aceita a família) ou com ato inventado, e
// aparece como "nesta partida (simulado)" — nunca como documentado (orglinks29 filtra o resto).
// Determinismo: Rng.fromSeed('aff29'); o gancho só age com ato seu na cena.

import { Rng, clamp } from '../../core/rng';
import { familyOf, genreById, l, type FamilyId, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { scandal } from '../scandal17';
import type { Act, GameState } from '../types';
import { fmtL, playerActs } from '../util';
import { a3Of, crime17, hasRacket, mIdx, orgById, type Org17 } from './crime17';
import { _mob29, asks29, peek29, type AskKind29 } from './mob29';
import { mov9, tierOf } from './movements9';

const N = (pt: string, en: string): L => l(pt, en);

export interface Aff29 {
  /** organização (crime17/data) */
  o: string;
  /** gêneros exatos e/ou famílias de gênero */
  genres: string[];
  fams?: FamilyId[];
  from: number; to: number;
  /** a cena (curto) */
  scene: L;
  /** nota factual neutra (documentada) ou "afinidade de jogo" */
  note: L;
  /** true = ligação cultural documentada; false = de jogo (organização inventada ou corte de época aproximado) */
  doc: boolean;
  /** estigma (0..1): chance relativa de pânico moral / censura */
  stigma: number;
}

export const AFF29: Aff29[] = [
  { o: 'cv', genres: ['funk_carioca'], from: 1995, to: 2100, scene: N('Funk "proibidão" nos bailes de comunidade do Rio', '"Proibidão" funk at Rio community parties'), doc: true, stigma: 0.7,
    note: N('Desde os anos 1990, o "proibidão" — funk que cita facções — circula em bailes e mixtapes no Rio; bailes foram alvo de operações policiais e de projetos de proibição.', 'Since the 1990s, "proibidão" — funk that names factions — has circulated at parties and on mixtapes in Rio; parties were targeted by police operations and ban proposals.') },
  { o: 'fbonde', genres: ['funk_carioca'], from: 1995, to: 2100, scene: N('Bailes da laje (inventado)', 'Rooftop parties (invented)'), doc: false, stigma: 0.5,
    note: N('Afinidade de jogo: gangue inventada que banca bailes na sua praça.', 'Game affinity: an invented crew that funds parties in its turf.') },
  { o: 'pcc', genres: ['funk_carioca', 'funk_ostentacao'], from: 2001, to: 2100, scene: N('Funk "proibidão" e ostentação nas periferias de São Paulo', '"Proibidão" and ostentação funk in São Paulo\'s outskirts'), doc: true, stigma: 0.7,
    note: N('Músicas de funk que citam a facção circulam em São Paulo desde os anos 2000.', 'Funk songs naming the faction have circulated in São Paulo since the 2000s.') },
  { o: 'sinaloa', genres: ['norteno', 'corridos_tumbados'], from: 1989, to: 2100, scene: N('Narcocorridos e corridos tumbados', 'Narcocorridos and corridos tumbados'), doc: true, stigma: 0.8,
    note: N('Narcocorridos encomendados e bailes bancados por cartéis são documentados; cantores do gênero já foram mortos após shows e estados mexicanos proibiram o gênero em eventos públicos.', 'Commissioned narcocorridos and cartel-funded dances are documented; singers of the genre have been killed after shows and Mexican states banned the genre at public events.') },
  { o: 'camorra', genres: ['canzone_napoletana'], from: 1990, to: 2100, scene: N('Neomelódicos de Nápoles (casamentos e festas de bairro)', 'Naples\' neomelodic singers (weddings and street feasts)'), doc: true, stigma: 0.5,
    note: N('Investigações antimáfia apontaram cantores neomelódicos em festas de clãs e canções que exaltam a vida do crime.', 'Anti-mafia investigations pointed to neomelodic singers at clan parties and songs glorifying the criminal life.') },
  { o: 'yamaguchi', genres: ['enka'], from: 1950, to: 1992, scene: N('Enka e a promoção de shows (kōgyō)', 'Enka and concert promotion (kōgyō)'), doc: true, stigma: 0.3,
    note: N('No pós-guerra, a promoção de shows no Japão passou por agências ligadas à yakuza; a lei antiyakuza de 1992 cortou esses laços.', 'In the postwar years, concert promotion in Japan went through yakuza-linked agencies; the 1992 anti-yakuza law cut those ties.') },
  { o: 'sumiyoshi', genres: ['enka'], from: 1958, to: 1992, scene: N('Enka nas casas noturnas de Tóquio', 'Enka in Tokyo nightclubs'), doc: false, stigma: 0.3,
    note: N('Afinidade de jogo pelo mesmo ramo (casas noturnas e kōgyō) — sem laço específico documentado.', 'Game affinity through the same business (nightclubs and kōgyō) — no specific documented tie.') },
  { o: 'mobpiru', genres: ['gfunk', 'hiphop'], from: 1988, to: 2100, scene: N('Gangsta rap da Costa Oeste', 'West Coast gangsta rap'), doc: true, stigma: 0.6,
    note: N('Associados de gangues de Los Angeles trabalharam como seguranças no rap dos anos 90 (processos públicos).', 'Los Angeles gang associates worked as security in 1990s rap (public court records).') },
  { o: 'sscrips', genres: ['gfunk', 'hiphop'], from: 1988, to: 2100, scene: N('Gangsta rap da Costa Oeste', 'West Coast gangsta rap'), doc: false, stigma: 0.6,
    note: N('Afinidade de cena (rivalidade de gangues no rap de LA); nenhum artista é ligado a ela por isso.', 'Scene affinity (gang rivalry in LA rap); no artist is tied to it because of this.') },
  { o: 'fblock', genres: ['drill'], from: 2012, to: 2100, scene: N('Drill de Chicago (gangue inventada)', 'Chicago drill (invented gang)'), doc: false, stigma: 0.7,
    note: N('Afinidade de jogo: gangue inventada que disputa o bairro em faixas de drill.', 'Game affinity: an invented gang fighting over the block in drill tracks.') },
  { o: 'fpost', genres: ['uk_drill'], from: 2014, to: 2100, scene: N('Drill britânico / road rap (turma inventada)', 'UK drill / road rap (invented crew)'), doc: false, stigma: 0.7,
    note: N('Afinidade de jogo; na vida real a polícia de Londres pediu a remoção de clipes de drill — aqui, censura e pânico moral.', 'Game affinity; in real life London police asked for drill videos to be removed — here, censorship and moral panic.') },
  { o: 'shower_posse', genres: ['dancehall'], from: 1980, to: 2010, scene: N('Dancehall dos "garrisons" de Kingston', 'Dancehall from Kingston\'s garrisons'), doc: true, stigma: 0.5,
    note: N('Sound systems e festas de rua dos bairros-guarnição de Kingston tinham patronos ligados a gangues políticas, segundo a imprensa e estudos da época.', 'Sound systems and street dances in Kingston\'s garrison communities had patrons tied to political gangs, per contemporary press and studies.') },
  { o: 'outfit', genres: ['doo_wop', 'jump_blues'], fams: ['blues_jazz', 'pop'], from: 1945, to: 1979, scene: N('Boates e jukeboxes de Chicago a Las Vegas', 'Nightclubs and jukeboxes from Chicago to Las Vegas'), doc: true, stigma: 0.3,
    note: N('O racket das jukeboxes e as boates da máfia foram expostos nas audiências do Senado (1959).', 'The jukebox racket and mob nightclubs were exposed in Senate hearings (1959).') },
  { o: 'genovese', genres: ['doo_wop', 'jump_blues'], fams: ['blues_jazz', 'pop'], from: 1945, to: 1979, scene: N('Boates da Rua 52 e distribuição de discos em Nova York', '52nd Street clubs and record distribution in New York'), doc: true, stigma: 0.3,
    note: N('Boates, jukeboxes e distribuição de discos em Nova York com laços relatados em investigações.', 'New York nightclubs, jukeboxes and record distribution with ties reported by investigators.') },
  { o: 'solntsevo', genres: ['estrada'], from: 1990, to: 2100, scene: N('Chanson russo ("blatnyak", no jogo dentro de Estrada)', 'Russian chanson ("blatnyak", within Estrada in the game)'), doc: false, stigma: 0.4,
    note: N('O "chanson russo" de temas de prisão é um gênero real; aqui é afinidade de jogo, sem laço específico com a organização.', '"Russian chanson" with prison themes is a real genre; here it is a game affinity, with no specific tie to the organization.') },
];

const genreOk = (s: GameState, g: string): boolean => !!genreById[g] && genreById[g].born <= s.year;
const orgOn = (s: GameState, o?: Org17): o is Org17 => !!o && o.from <= s.year && s.year <= o.to;

/** Afinidades que valem agora (época da afinidade, da organização e do gênero). */
export function affs29(s: GameState): (Aff29 & { org: Org17 })[] {
  const out: (Aff29 & { org: Org17 })[] = [];
  for (const a of AFF29) {
    const o = orgById(s, a.o);
    if (!orgOn(s, o) || s.year < a.from || s.year > a.to) continue;
    if (!a.genres.some((g) => genreOk(s, g)) && !a.fams?.length) continue;
    out.push({ ...a, org: o });
  }
  return out;
}
const fits = (a: Aff29, genre: string): boolean => a.genres.includes(genre) || !!a.fams?.includes(familyOf(genre));
/** Facções de uma cena (gênero + cidade): o território é o país da organização. */
export function sceneAff29(s: GameState, genre: string, city: string): (Aff29 & { org: Org17 })[] {
  const a3 = a3Of(s, city);
  return affs29(s).filter((a) => fits(a, genre) && a.org.a3 === a3);
}
/** Cenas de uma organização (card). */
export const orgAff29 = (s: GameState, oid: string): (Aff29 & { org: Org17 })[] => affs29(s).filter((a) => a.o === oid.replace(/^o:/, ''));
/** Facções que rondam um ato (pela cena dele — nunca uma afirmação sobre as pessoas). */
export const actAff29 = (s: GameState, a: Act): (Aff29 & { org: Org17 })[] => sceneAff29(s, a.genre, a.city);

/** Qual pedido a facção faz a um ato seu da cena. */
function pickAsk(o: Org17, a: Aff29, r: Rng): AskKind29 {
  const opts: AskKind29[] = [];
  if (hasRacket(o, 'clubs') || o.kind === 'gang' || o.kind === 'cartel') opts.push('baile', 'baile');
  if (a.stigma >= 0.5) opts.push('homage');
  if (hasRacket(o, 'protection')) opts.push('toll');
  return opts.length ? r.pick(opts) : 'baile';
}

registerSimHook('month', 'aff29', (s) => {
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split');
  if (!mine.length) return;
  const r = Rng.fromSeed(`${s.config.seed}:aff29:${mIdx(s)}`);
  for (const act of mine) {
    for (const a of actAff29(s, act)) {
      const o = a.org;
      if ((peek29(s)?.o[o.id]?.hos ?? 0) >= 60 || asks29(s, o.id).length || (crime17(s).down[o.id] ?? 0) > s.week) continue;
      if (!r.chance(0.08 + a.stigma * 0.06)) continue;
      _mob29.ask29(s, o, pickAsk(o, a, r), undefined, act.id);
    }
  }
  // movimentos de um gênero da facção, no território dela, com ato seu dentro: crescem mais rápido, mas com estigma
  for (const mv of s.movements) {
    const x = mov9(s).m[mv.id];
    if (!x || x.phase === 'death' || x.phase === 'canon') continue;
    const af = sceneAff29(s, mv.genreId, mv.city)[0];
    if (!af) continue;
    const mineIn = mine.find((a) => tierOf(s, a.id)?.mv.id === mv.id);
    if (!mineIn) continue;
    mv.strength = clamp(mv.strength + 0.6, 0, 100);
    if (r.chance(0.03 * af.stigma)) scandal(s, mineIn.id, 'conduct', 20, fmtL(N('Estigma: o movimento {m} é associado a {o} pela imprensa.', 'Stigma: the press ties the {m} movement to {o}.'), { m: mv.name, o: af.org.name }), { tags: ['aff29', 'movement'] });
  }
});
