// Rivais com estratégia reconhecível (rodada 8). Cada selo segue um "manual" derivado do arquétipo:
//  - Abutre (império): deixa os outros arriscarem e compra quem começa a subir — inclusive do jogador.
//  - Dono da cena (caçador de cenas): escolhe uma cena (cidade × gênero) e assina quem aparece nela.
//  - Catálogo (guardião): compra masters de quem está em crise e vive de relançamentos.
//  - Tecnologia (fábrica de hits): aposta cedo em formatos novos, disputa produtores e antecipa datas.
//  - Palco (boutique): turnês e relação com fãs; elenco pequeno e fiel.
// As jogadas aparecem como ações observáveis no relatório de rivais e na ficha do selo — disputar um
// produtor, antecipar um lançamento, oferecer contrato mais atraente, abandonar um mercado — para o
// jogador aprender a reconhecer e antecipar cada um.

import { clamp, hashString, type Rng } from '../../core/rng';
import { techById } from '../../data/rules';
import { cityById, familyOf, genreById, l, marketById, type FamilyId, type L, type MarketId } from '../../data/world';
import { endContract, expectedAdvance, signWithRival } from '../contracts';
import { emitEvent, type EventDef } from '../events';
import { deferEvents, registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import { launchNpcRelease } from '../market';
import { unreleasedRecorded } from '../production';
import type { Act, GameState, Label, Release } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { bondNote, prefsOf } from './identity8';
import type { ProfileId } from './identity/data';
import { XBY_ID, envOf, adj } from './identity/extra';
import { skipBlockedLog } from './gate14';

export type PlaybookId = 'vulture' | 'scene' | 'catalog' | 'tech' | 'live' | 'idol' | 'gospel' | 'prestige' | 'sync' | 'regional' | 'fund' | 'visionary' | 'purist'
  | 'viral' | 'school' | 'royalty' | 'conglomerate' | 'importer' | 'agitator' | 'copycat' | 'budget';
export type MoveKind = 'buyout' | 'buy_offer' | 'scene_sign' | 'interest' | 'catalog_buy' | 'reissue' | 'tech_bet' | 'producer' | 'date_move' | 'outbid' | 'abandon' | 'tour_push'
  | 'idol_debut' | 'gospel_circuit' | 'prestige_award' | 'sync_deal' | 'regional_tour' | 'asset_strip' | 'visionary_bet' | 'purist_refuse'
  | 'viral_grab' | 'viral_drop' | 'school_class' | 'school_grad' | 'royalty_buy' | 'royalty_yield' | 'media_push' | 'media_absorb'
  | 'import_hit' | 'import_license' | 'scene_night' | 'agitator_sign' | 'major_attack' | 'copy_clone' | 'copy_sign' | 'budget_comp' | 'budget_sign'
  | 'strategy_change';

export interface Move { w: number; k: MoveKind; a?: string; x?: string }

export interface Rivals8State {
  log: Record<string, Move[]>;
  /** interesse declarado: ato → selo e semana */
  interest: Record<string, { lb: string; w: number }>;
  /** cena dominada por selo ("cidade:gênero") */
  scene: Record<string, string>;
  /** aposta tecnológica por selo */
  tech: Record<string, { id: string; until: number }>;
  /** lançamentos do jogador já disputados (id pendente → 1) */
  clash: Record<string, 1>;
  lastClash: number;
}

declare module '../ext4' { interface Ext4 { rivals8: Rivals8State } }
registerExt4('rivals8', () => ({ log: {}, interest: {}, scene: {}, tech: {}, clash: {}, lastClash: -999 }));
export const rivals8 = (s: GameState): Rivals8State => (s as unknown as { x4: { rivals8: Rivals8State } }).x4.rivals8;

export const PLAYBOOKS: Record<PlaybookId, { name: L; desc: L; tells: L[]; leader: L; profiles: ProfileId[] }> = {
  vulture: {
    name: l('Abutre', 'Vulture'),
    desc: l('Major que deixa os outros arriscarem e compra quem começa a subir.', 'A major that lets others take the risk and buys whoever starts rising.'),
    tells: [l('Fica de olho em atos com fama subindo rápido.', 'Watches acts whose fame rises fast.'), l('Oferece comprar contratos, inclusive os seus.', 'Offers to buy contracts, including yours.'), l('Antecipa lançamentos para a semana dos seus.', 'Moves releases into the same week as yours.')],
    leader: l('O Barão da Major', 'The Major Baron'),
    profiles: ['hits', 'predator'],
  },
  scene: {
    name: l('Dono da cena', 'Scene owner'),
    desc: l('Selo independente que domina uma cena local e assina quem aparece nela.', 'An indie that dominates a local scene and signs whoever emerges there.'),
    tells: [l('Contrata cedo e barato na própria cena.', 'Signs early and cheap in its own scene.'), l('Artistas da cena preferem ficar com ele.', 'Scene artists prefer to stay with it.')],
    leader: l('O Papa da Cena', 'The Scene Pope'),
    profiles: ['scene', 'diy'],
  },
  catalog: {
    name: l('Guardião de catálogo', 'Catalog keeper'),
    desc: l('Aposta em catálogo e relançamentos; compra masters de quem está em crise.', 'Bets on catalog and reissues; buys masters from labels in trouble.'),
    tells: [l('Aparece quando um selo quebra.', 'Shows up when a label goes under.'), l('Relança clássicos em vez de assinar novatos.', 'Reissues classics instead of signing newcomers.')],
    leader: l('O Curador do Cofre', 'The Vault Curator'),
    profiles: ['catalog', 'archive'],
  },
  tech: {
    name: l('Aposta tecnológica', 'Tech bettor'),
    desc: l('Investe pesado em tecnologia e formatos novos; disputa produtores e datas.', 'Invests heavily in technology and new formats; fights for producers and dates.'),
    tells: [l('Chega primeiro em cada formato novo.', 'First into every new format.'), l('Contrata os melhores produtores do mercado.', 'Hires the best producers on the market.'), l('Antecipa lançamentos.', 'Moves release dates earlier.')],
    leader: l('O Engenheiro Obstinado', 'The Obsessive Engineer'),
    profiles: ['tech', 'export'],
  },
  live: {
    name: l('Palco e fãs', 'Stage and fans'),
    desc: l('Prioriza shows e relação com os fãs; elenco pequeno e fiel.', 'Prioritizes shows and fan relationships; a small, loyal roster.'),
    tells: [l('Põe o elenco na estrada.', 'Keeps its roster on the road.'), l('Os fãs dos seus artistas são fiéis.', 'Its artists have loyal fans.')],
    leader: l('O Empresário de Estrada', 'The Road Manager'),
    profiles: ['live'],
  },
  idol: {
    name: l('Fábrica de ídolos', 'Idol factory'),
    desc: l('Treina jovens por anos e estreia grupos coreografados com fandom organizado.', 'Trains youngsters for years and debuts choreographed groups with an organized fandom.'),
    tells: [l('Estreia grupos grandes de jovens, sempre com campanha pesada.', 'Debuts large youth groups, always with a heavy campaign.'), l('Assina trainees e contratos longos.', 'Signs trainees on long contracts.')],
    leader: l('A Diretora de Treinamento', 'The Training Director'), profiles: ['idol', 'hits'],
  },
  gospel: {
    name: l('Rede gospel', 'Gospel network'),
    desc: l('Vive do circuito de igrejas, congressos e rádios religiosas.', 'Lives off the circuit of churches, conventions and religious radio.'),
    tells: [l('Põe o elenco nos congressos de louvor.', 'Puts its roster on the praise-convention circuit.'), l('Atos sacros fiéis, quase nunca trocam de selo.', 'Loyal sacred acts that almost never change label.')],
    leader: l('O Pastor-Empresário', 'The Pastor-Entrepreneur'), profiles: ['gospel'],
  },
  prestige: {
    name: l('Boutique de prestígio', 'Prestige boutique'),
    desc: l('Poucos discos impecáveis, campanhas de prêmios e crítica a favor.', 'Few impeccable records, awards campaigns and critics on its side.'),
    tells: [l('Faz campanha de prêmios para cada disco.', 'Runs an awards campaign for every record.'), l('Lança pouco e raramente erra a mão.', 'Releases little and rarely misses.')],
    leader: l('O Produtor Perfeccionista', 'The Perfectionist Producer'), profiles: ['hifi', 'luxury'],
  },
  sync: {
    name: l('Casa de sync', 'Sync house'),
    desc: l('Coloca música em filmes, comerciais e novelas; o artista é fornecedor.', 'Places music in films, ads and soaps; the artist is a supplier.'),
    tells: [l('Anuncia faixas em trilhas e comerciais.', 'Announces tracks in soundtracks and ads.'), l('Aceita músicas "limpas" e versáteis.', 'Takes "clean", versatile songs.')],
    leader: l('A Supervisora de Música', 'The Music Supervisor'), profiles: ['sync'],
  },
  regional: {
    name: l('Rei regional', 'Regional king'),
    desc: l('Domina um gênero e um território com casa cheia e rádio local.', 'Rules one genre and one territory with packed houses and local radio.'),
    tells: [l('Fecha o circuito regional com seus atos.', 'Locks up the regional circuit with its acts.'), l('Quase não sai do mercado de casa.', 'Barely leaves its home market.')],
    leader: l('O Coronel do Interior', 'The Heartland Colonel'), profiles: ['regional'],
  },
  fund: {
    name: l('Fundo de investimento', 'Investment fund'),
    desc: l('Compra selos em apuros, desmonta e vende os ativos em pedaços.', 'Buys labels in trouble, takes them apart and sells the assets in pieces.'),
    tells: [l('Aparece quando um selo está sem caixa.', 'Shows up when a label is out of cash.'), l('Vende o que compra.', 'Sells what it buys.')],
    leader: l('O Gestor de Ativos', 'The Asset Manager'), profiles: ['predator', 'hits'],
  },
  visionary: {
    name: l('Executivo visionário', 'Visionary executive'),
    desc: l('Aposta em artistas que ninguém entende e espera o mundo alcançar.', 'Bets on artists nobody understands and waits for the world to catch up.'),
    tells: [l('Assina o artista mais estranho da cena.', 'Signs the oddest artist in the scene.'), l('Perde dinheiro por anos e de repente acerta.', 'Loses money for years and suddenly hits.')],
    leader: l('O Visionário Teimoso', 'The Stubborn Visionary'), profiles: ['political', 'starlabel', 'tech'],
  },
  purist: {
    name: l('Indie purista', 'Purist indie'),
    desc: l('Recusa as majors, protege os artistas e vive de credibilidade.', 'Refuses the majors, protects its artists and lives on credibility.'),
    tells: [l('Recusa ofertas de compra de majors.', 'Turns down major buyout offers.'), l('Artistas ficam por lealdade, não por dinheiro.', 'Artists stay for loyalty, not money.')],
    leader: l('A Fundadora Intransigente', 'The Uncompromising Founder'), profiles: ['diy', 'scene'],
  },
  // ---- rodada 10: oito manuais novos
  viral: {
    name: l('Caçador de virais', 'Viral hunter'),
    desc: l('Assina quem estoura de repente, com contrato curto, e dispensa assim que o viral esfria.', 'Signs whoever suddenly blows up, on a short deal, and drops them as soon as the buzz cools.'),
    tells: [l('Aparece na semana em que um novato dispara.', 'Shows up the week a newcomer takes off.'), l('Dispensa artistas depois de um ano morno.', 'Drops acts after one lukewarm year.')],
    leader: l('O Garimpeiro de Algoritmo', 'The Algorithm Prospector'), profiles: ['hits', 'tech'],
  },
  school: {
    name: l('Gravadora-escola', 'Artist school'),
    desc: l('Contrata desconhecidos com potencial e passa anos lapidando antes de cobrar resultado.', 'Signs unknowns with potential and spends years polishing them before expecting results.'),
    tells: [l('Assina gente que ninguém conhece.', 'Signs people nobody knows.'), l('Os artistas "se formam" depois de dois ou três anos e sobem de vez.', 'Its acts "graduate" after two or three years and rise for good.')],
    leader: l('O Professor Paciente', 'The Patient Teacher'), profiles: ['dev', 'scene'],
  },
  royalty: {
    name: l('Fundo de royalties', 'Royalty fund'),
    desc: l('Compra direitos de canções como ativo financeiro e vive dos dividendos; quase não grava.', 'Buys song rights as a financial asset and lives off the dividends; barely records.'),
    tells: [l('Paga bem por catálogos antigos de outros selos.', 'Pays well for other labels\' old catalogs.'), l('Anuncia dividendos em vez de lançamentos.', 'Announces dividends instead of releases.')],
    leader: l('O Gestor de Direitos', 'The Rights Manager'), profiles: ['catalog', 'archive'],
  },
  conglomerate: {
    name: l('Conglomerado de mídia', 'Media conglomerate'),
    desc: l('Rádio, TV, revista e gravadora no mesmo grupo: empurra o próprio elenco em todos os canais.', 'Radio, TV, magazine and label in one group: pushes its own roster on every channel.'),
    tells: [l('O mesmo artista aparece na TV, no rádio e na capa na mesma semana.', 'The same act shows up on TV, radio and the cover in the same week.'), l('Absorve artistas de selos pequenos para o grupo.', 'Absorbs acts from small labels into the group.')],
    leader: l('O Magnata das Comunicações', 'The Media Mogul'), profiles: ['hits', 'starlabel'],
  },
  importer: {
    name: l('Importadora de sucessos', 'Hit importer'),
    desc: l('Traz artistas e hits de outros países para o mercado de casa, antes dos concorrentes.', 'Brings acts and hits from other countries into its home market, ahead of the competition.'),
    tells: [l('Assina artistas estrangeiros que já fazem sucesso lá fora.', 'Signs foreign acts that are already big abroad.'), l('Licencia hits estrangeiros das paradas.', 'Licenses foreign chart hits.')],
    leader: l('O Caixeiro-Viajante', 'The Travelling Salesman'), profiles: ['export', 'hits'],
  },
  agitator: {
    name: l('Agitador de cena', 'Scene agitator'),
    desc: l('Indie militante: organiza noites, briga com as majors em público e assina os barulhentos.', 'Militant indie: throws club nights, picks public fights with the majors and signs the noisy ones.'),
    tells: [l('Faz noites e festivais da cena.', 'Throws scene nights and festivals.'), l('Ataca as majors na imprensa.', 'Attacks the majors in the press.')],
    leader: l('O Agitador de Fanzine', 'The Fanzine Agitator'), profiles: ['political', 'diy'],
  },
  copycat: {
    name: l('Copiadora de tendências', 'Trend copycat'),
    desc: l('Quando algo chega ao nº 1, lança logo um "parecido" e assina sósias do sucesso.', 'When something hits No. 1, it quickly releases a "lookalike" and signs soundalikes.'),
    tells: [l('Lança um clone do nº 1 semanas depois.', 'Releases a No. 1 clone weeks later.'), l('Assina artistas do gênero da moda.', 'Signs acts in the genre of the moment.')],
    leader: l('O Seguidor Veloz', 'The Fast Follower'), profiles: ['hits'],
  },
  budget: {
    name: l('Selo de baciada', 'Budget label'),
    desc: l('Muito volume e pouco custo: coletâneas baratas, regravações e contratos de quase nada.', 'High volume, low cost: cheap compilations, re-recordings and next-to-nothing deals.'),
    tells: [l('Lança coletâneas do próprio catálogo o tempo todo.', 'Puts out compilations of its own catalog all the time.'), l('Assina muitos artistas pequenos sem adiantamento.', 'Signs lots of small acts with no advance.')],
    leader: l('O Atacadista', 'The Wholesaler'), profiles: ['catalog', 'regional'],
  },
};

/** Mesmo arquétipo de rivals2.ts (sem importá-lo: evita ciclo de carga com events.ts no navegador). */
function archetypeOf(lb: Label): NonNullable<Label['archetype']> {
  if (lb.archetype) return lb.archetype;
  lb.archetype = lb.family === 'A' ? 'empire' : lb.family === 'B' ? (lb.roster.length < 5 ? 'boutique' : 'scene_hunter') : lb.family === 'C' ? 'hitmaker' : 'catalog';
  return lb.archetype;
}

/** Manuais possíveis por arquétipo (o original aparece em dobro; a escolha é fixa pelo id do selo). */
const VARIANTS: Record<NonNullable<Label['archetype']>, PlaybookId[]> = {
  empire: ['vulture', 'vulture', 'fund', 'idol', 'visionary'],
  scene_hunter: ['scene', 'scene', 'regional', 'purist', 'gospel'],
  boutique: ['live', 'live', 'prestige', 'purist'],
  catalog: ['catalog', 'catalog', 'sync', 'gospel'],
  hitmaker: ['tech', 'tech', 'idol', 'visionary', 'sync'],
};

export function playbookOf(lb: Label): PlaybookId {
  if (lb.playbook && lb.playbook in PLAYBOOKS) return lb.playbook as PlaybookId;
  const v = VARIANTS[archetypeOf(lb)];
  return v[hashString(`pb:${lb.id}`) % v.length];
}

/** Perfil de identidade do selo rival, fixo, sorteado entre os perfis do manual (os 18 perfis valem para todos). */
export function rivalProfile(lb: Label): ProfileId {
  const pool = PLAYBOOKS[playbookOf(lb)].profiles;
  return pool[hashString(`pf:${lb.id}`) % pool.length];
}

const MOVE_TXT: Record<MoveKind, L> = {
  buyout: l('comprou o contrato de {a} de {x}', 'bought {a}\'s contract from {x}'),
  buy_offer: l('ofereceu comprar o contrato de {a} (seu)', 'offered to buy {a}\'s contract (yours)'),
  scene_sign: l('assinou {a}, da cena {x}', 'signed {a}, from the {x} scene'),
  interest: l('está de olho em {a}', 'has its eye on {a}'),
  catalog_buy: l('comprou {a} masters de {x}', 'bought {a} masters from {x}'),
  reissue: l('relançou o clássico "{a}"', 'reissued the classic "{a}"'),
  tech_bet: l('aposta pesado em {x}', 'is betting heavily on {x}'),
  producer: l('contratou o produtor {a}', 'hired producer {a}'),
  date_move: l('antecipou o lançamento de {a} para a semana do seu "{x}"', 'moved {a}\'s release into the week of your "{x}"'),
  outbid: l('cobriu sua oferta e assinou {a}', 'outbid you and signed {a}'),
  abandon: l('abandonou o mercado {x}', 'abandoned the {x} market'),
  tour_push: l('pôs {a} na estrada para fidelizar fãs', 'put {a} on the road to build loyal fans'),
  idol_debut: l('estreou o grupo {a} depois de anos de treino', 'debuted the group {a} after years of training'),
  gospel_circuit: l('levou {a} ao circuito de congressos e igrejas', 'took {a} onto the convention and church circuit'),
  prestige_award: l('abriu campanha de prêmios para {a}', 'launched an awards campaign for {a}'),
  sync_deal: l('emplacou {a} numa trilha', 'landed {a} in a soundtrack'),
  regional_tour: l('fechou o circuito regional com {a}', 'locked up the regional circuit with {a}'),
  asset_strip: l('desmontou {x} e vendeu {a} ativos', 'took {x} apart and sold {a} assets'),
  visionary_bet: l('apostou em {a}, que ninguém entendia', 'bet on {a}, whom nobody understood'),
  purist_refuse: l('recusou a major e manteve {a} independente', 'turned down the major and kept {a} independent'),
  viral_grab: l('agarrou {a} na semana em que viralizou', 'grabbed {a} the week they went viral'),
  viral_drop: l('dispensou {a}: o viral esfriou', 'dropped {a}: the buzz cooled'),
  school_class: l('matriculou {a} na turma de desenvolvimento', 'enrolled {a} in its development class'),
  school_grad: l('{a} se formou depois de {x} anos de lapidação', '{a} graduated after {x} years of polishing'),
  royalty_buy: l('comprou os direitos de {a} obras de {x}', 'bought the rights to {a} works from {x}'),
  royalty_yield: l('distribuiu dividendos de {a} obras do fundo', 'paid out dividends from {a} works in the fund'),
  media_push: l('pôs {a} na TV, no rádio e na revista do grupo na mesma semana', 'put {a} on the group\'s TV, radio and magazine in the same week'),
  media_absorb: l('absorveu {a} de {x} para o grupo', 'absorbed {a} from {x} into the group'),
  import_hit: l('importou {a}, sucesso em {x}', 'imported {a}, a hit in {x}'),
  import_license: l('licenciou o hit estrangeiro "{a}"', 'licensed the foreign hit "{a}"'),
  scene_night: l('organizou uma noite da cena {x}', 'threw a {x} scene night'),
  agitator_sign: l('assinou {a}, a banda mais barulhenta da cena', 'signed {a}, the noisiest act in the scene'),
  major_attack: l('atacou {x} em público: "as majors matam a música"', 'publicly attacked {x}: "the majors kill music"'),
  copy_clone: l('lançou um "parecido" de "{x}" com {a}', 'released a lookalike of "{x}" with {a}'),
  copy_sign: l('assinou {a}, sósia do sucesso do momento', 'signed {a}, a soundalike of the hit of the moment'),
  budget_comp: l('lançou a coletânea barata "Os Maiores Sucessos de {x}" ({a} faixas)', 'released the cheap compilation "The Greatest Hits of {x}" ({a} tracks)'),
  budget_sign: l('assinou {a} sem adiantamento', 'signed {a} with no advance'),
  strategy_change: l('mudou de estratégia com o novo líder {a}: agora é "{x}"', 'changed strategy under new leader {a}: now "{x}"'),
};

export function sceneName(key: string): string {
  const [city, genre] = key.split(':');
  return `${cityById[city]?.name ?? city} · ${genreById[genre]?.name.pt ?? genre}`;
}

function sceneNameL(key: string): L {
  const [city, genre] = key.split(':');
  const c = cityById[city]?.name ?? city;
  const g = genreById[genre]?.name ?? l(genre, genre);
  return { pt: `${c} · ${g.pt}`, en: `${c} · ${g.en}` };
}

/** Texto de uma jogada (para a ficha do selo e o relatório). */
export function moveText(m: Move): L {
  let x: L | string = m.x ?? '';
  if (m.k === 'abandon') x = marketById[m.x as MarketId]?.name ?? (m.x ?? '');
  else if (m.k === 'tech_bet') x = techById[m.x ?? '']?.name ?? (m.x ?? '');
  else if ((m.k === 'scene_sign' || m.k === 'scene_night') && m.x?.includes(':')) x = sceneNameL(m.x);
  else if (m.k === 'import_hit') x = marketById[m.x as MarketId]?.name ?? (m.x ?? '');
  else if (m.k === 'strategy_change') x = PLAYBOOKS[m.x as PlaybookId]?.name ?? (m.x ?? '');
  return fmtL(MOVE_TXT[m.k], { a: m.a ?? '', x });
}

export function logMove(s: GameState, lb: Label, m: Omit<Move, 'w'>): void {
  if (skipBlockedLog(s, lb.id, m.a)) return;
  const st = rivals8(s);
  const mv: Move = { w: s.week, ...m };
  const list = (st.log[lb.id] ??= []);
  list.push(mv);
  if (list.length > 8) list.splice(0, list.length - 8);
  if (s.rivalReport) {
    s.rivalReport.items.push({ labelId: lb.id, text: fmtL(l('{d}.', '{d}.'), { d: moveText(mv) }) });
    if (s.rivalReport.items.length > 20) s.rivalReport.items.splice(0, s.rivalReport.items.length - 20);
  }
  lb.lastDecision = moveText(mv);
}

// ---------------------------------------------------------------- jogadas

const free = (a: Act) => !a.owner && !a.playerBand && (a.status === 'active' || a.status === 'emerging') && !a.deceased;

function markInterest(s: GameState, lb: Label, a: Act): void {
  const st = rivals8(s);
  if (st.interest[a.id]) return;
  st.interest[a.id] = { lb: lb.id, w: s.week };
  logMove(s, lb, { k: 'interest', a: a.name });
}

function homeScene(s: GameState, lb: Label): string | undefined {
  const st = rivals8(s);
  if (st.scene[lb.id]) return st.scene[lb.id];
  const counts: Record<string, number> = {};
  for (const id of lb.roster) {
    const a = s.acts[id];
    if (a) counts[`${a.city}:${a.genre}`] = (counts[`${a.city}:${a.genre}`] ?? 0) + 1;
  }
  const best = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
  if (best) st.scene[lb.id] = best[0];
  return st.scene[lb.id];
}

function sceneTargets(s: GameState, key: string): Act[] {
  const [city, genre] = key.split(':');
  const fam = familyOf(genre);
  return Object.values(s.acts).filter((a) => free(a) && a.city === city && familyOf(a.genre) === fam);
}

function vulture(s: GameState, r: Rng, lb: Label, all: Act[]): void {
  // interesse: atos livres que começam a subir
  if (r.chance(0.05)) {
    const rising = all.filter((a) => free(a) && a.fame > 10 && a.momentum > 45).sort((x, y) => y.momentum - x.momentum)[0];
    if (rising) markInterest(s, lb, rising);
  }
  // compra o contrato de quem subiu num selo menor
  if (r.chance(0.05) && lb.cash > money(s, 400000)) {
    const target = all.filter((a) => {
      if (!a.owner || a.owner === 'player' || a.owner === lb.id || a.fame < 25 || a.momentum < 50) return false;
      const o = s.labels[a.owner];
      return !!o && o.active && (o.family === 'B' || o.family === 'D') && playbookOf(o) !== 'vulture';
    }).sort((x, y) => y.fame - x.fame)[0];
    if (target) {
      const seller = s.labels[target.owner!];
      const price = money(s, expectedAdvance(s, target) * 1.5);
      if (lb.cash > price * 2) {
        lb.cash -= price;
        seller.cash += price;
        endContract(s, target, 'terminated');
        signWithRival(s, target, lb.id, r);
        logMove(s, lb, { k: 'buyout', a: target.name, x: seller.name });
        remember(s, 'buyout8', fmtL(l('{b} compra o contrato de {a} de {c}.', '{b} buys {a}\'s contract from {c}.'), { b: lb.name, a: target.name, c: seller.name }), { actId: target.id });
      }
    }
  }
  // e de vez em quando tenta comprar um dos seus
  if (s.config.role !== 'artist' && r.chance(0.012) && lb.cash > money(s, 500000)) {
    const mine = playerActs(s).map((id) => s.acts[id]).filter((a) => a && !a.playerBand && a.fame >= 25 && a.momentum >= 45 && a.contractId && s.contracts[a.contractId]?.party === 'player');
    const a = mine.sort((x, y) => y.momentum - x.momentum)[0];
    if (a && !s.decisions.some((d) => d.eventId === 'r8_buyout')) {
      emitEvent(s, r, 'r8_buyout', { act: a.id, label: lb.id, fee: Math.round(6000 + a.fame * a.fame * 25) });
      logMove(s, lb, { k: 'buy_offer', a: a.name });
    }
  }
}

function sceneOwner(s: GameState, r: Rng, lb: Label): void {
  const key = homeScene(s, lb);
  if (!key) return;
  if (r.chance(0.06)) {
    const t0 = sceneTargets(s, key).sort((x, y) => y.fame - x.fame || y.potential - x.potential);
    if (t0[0]) markInterest(s, lb, t0[0]);
  }
  if (r.chance(0.04) && lb.roster.length < 18) {
    const a = sceneTargets(s, key).sort((x, y) => y.potential - x.potential)[0];
    if (a && lb.cash > money(s, expectedAdvance(s, a) * 1.2)) {
      signWithRival(s, a, lb.id, r);
      s.scenes[key] = (s.scenes[key] ?? 0) + 1.5;
      logMove(s, lb, { k: 'scene_sign', a: a.name, x: key });
    }
  }
}

function catalogKeeper(s: GameState, r: Rng, lb: Label): void {
  if (r.chance(0.03) && lb.cash > money(s, 300000)) {
    const sellers = Object.values(s.labels).filter((x) => x.active && x.id !== lb.id && x.cash < money(s, 150000));
    const seller = sellers.length ? r.pick(sellers) : undefined;
    if (seller) {
      const rels = Object.values(s.releases).filter((x) => x.owner === seller.id && s.year - x.year >= 5).sort((x, y) => y.totalUnits - x.totalUnits).slice(0, 6);
      if (rels.length) {
        const price = money(s, 2500 * rels.length);
        for (const x of rels) x.owner = lb.id;
        lb.cash -= price;
        seller.cash += price;
        logMove(s, lb, { k: 'catalog_buy', a: String(rels.length), x: seller.name });
      }
    }
  }
  if (r.chance(0.05)) {
    const own = Object.values(s.releases).filter((x) => x.owner === lb.id && s.year - x.year >= 15 && x.q >= 58 && !x.reissueOf);
    const rel = own.length ? r.pick(own) : undefined;
    if (rel) {
      const v = money(s, 2000 + rel.q * 40);
      lb.cash += v;
      lb.revenueYear += v;
      logMove(s, lb, { k: 'reissue', a: rel.title });
    }
  }
}

function techBettor(s: GameState, r: Rng, lb: Label): void {
  const st = rivals8(s);
  const bet = st.tech[lb.id];
  if (bet && bet.until < s.year) delete st.tech[lb.id];
  if (!st.tech[lb.id]) {
    const fresh = Object.entries(s.techDates).find(([, y]) => y === s.year || y === s.year - 1);
    if (fresh && r.chance(0.35) && lb.cash > money(s, 200000)) {
      st.tech[lb.id] = { id: fresh[0], until: s.year + 3 };
      lb.cash -= money(s, 30000);
      logMove(s, lb, { k: 'tech_bet', x: fresh[0] });
    }
  }
  if (r.chance(0.025) && lb.cash > money(s, 150000)) {
    const pro = s.professionals.filter((x) => x.role === 'producer' && x.skill >= 55).sort((x, y) => y.skill - x.skill)[0];
    if (pro) {
      s.professionals = s.professionals.filter((x) => x !== pro);
      lb.cash -= pro.salary * 12;
      logMove(s, lb, { k: 'producer', a: pro.name });
      if (s.config.role !== 'artist') notify(s, fmtL(l('{b} contratou o produtor {p} antes de você.', '{b} hired producer {p} before you could.'), { b: lb.name, p: pro.name }), 'info');
    }
  }
}

function stageAndFans(s: GameState, r: Rng, lb: Label): void {
  if (!r.chance(0.03)) return;
  const a = lb.roster.map((id) => s.acts[id]).filter((x) => x && x.status === 'active').sort((x, y) => y.fans.active - x.fans.active)[0];
  if (!a) return;
  a.fans.core += Math.round(a.fans.active * 0.012);
  a.fans.active += Math.round(a.fans.casual * 0.004);
  logMove(s, lb, { k: 'tour_push', a: a.name });
}

/** Interesse vira contrato (ou some): se o jogador tinha oferta na mesa, perde a disputa. */
function resolveInterest(s: GameState, r: Rng): void {
  const st = rivals8(s);
  for (const [actId, it] of Object.entries(st.interest)) {
    const a = s.acts[actId];
    const lb = s.labels[it.lb];
    if (!a || !lb || !lb.active || !free(a) || s.week - it.w > 30) { delete st.interest[actId]; continue; }
    if (!r.chance(0.18) || lb.cash < money(s, expectedAdvance(s, a) * 1.3)) continue;
    const offer = s.offers.find((o) => o.actId === actId && (o.status === 'pending' || o.status === 'counter'));
    signWithRival(s, a, lb.id, r);
    if (a.owner !== lb.id) { skipBlockedLog(s, lb.id, a.name); continue; }
    delete st.interest[actId];
    const key = rivals8(s).scene[lb.id];
    if (offer) {
      offer.status = 'sniped';
      offer.note = lb.name;
      s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 8;
      logMove(s, lb, { k: 'outbid', a: a.name });
      notify(s, fmtL(l('{b} ofereceu um contrato mais atraente e assinou {a}. Eles já estavam de olho.', '{b} made a more attractive offer and signed {a}. They had been watching.'), { b: lb.name, a: a.name }), 'bad');
    } else logMove(s, lb, { k: 'scene_sign', a: a.name, x: key && `${a.city}:${a.genre}` === key ? key : `${a.city}:${a.genre}` });
  }
}

// ---------------------------------------------------------------- decisão: compra de contrato do jogador

const BUYOUT_EVENTS: EventDef[] = [{
  id: 'r8_buyout', cat: 'contract', tone: 'neutral', tags: [], cooldown: 8, forcedOnly: true,
  title: l('{labelName} quer comprar {act}', '{labelName} wants to buy {act}'),
  text: l('{labelName} esperou você arriscar e agora que {act} está subindo oferece {feeTxt} pelo contrato. É o jeito deles: comprar o que outros construíram.', '{labelName} waited for you to take the risk and, now that {act} is rising, offers {feeTxt} for the contract. It is their way: buying what others built.'),
  options: [
    { id: 'sell', label: l('Vender o contrato', 'Sell the contract'), hint: l('Dinheiro agora; o artista lembra que foi vendido.', 'Cash now; the artist remembers being sold.'), apply: (s, r, c) => {
      const a = s.acts[String(c.act)]; const lb = s.labels[String(c.label)];
      if (!a || !lb || a.owner !== 'player') return;
      const fee = money(s, Number(c.fee));
      post(s, `r8sell:${a.id}:${s.week}`, fee, 'asset_sales', `Venda do contrato de ${a.name}`);
      lb.cash -= fee;
      bondNote(s, a, 'abandon', lb.name);
      endContract(s, a, 'terminated');
      signWithRival(s, a, lb.id, r);
    } },
    { id: 'keep', label: l('Recusar e valorizar o artista (+2 pontos de royalty)', 'Refuse and reward the artist (+2 royalty points)'), hint: l('Margem menor; confiança e memória de apoio.', 'Lower margin; trust and a memory of support.'), apply: (s, _r, c) => {
      const a = s.acts[String(c.act)];
      const k = a?.contractId ? s.contracts[a.contractId] : undefined;
      if (!a || !k) return;
      k.royalty = clamp(k.royalty + 0.02, 0, 0.6);
      a.trust = clamp(a.trust + 6, 0, 100);
      bondNote(s, a, 'support', l('recusou vender', 'refused to sell').pt);
      s.rivalries[String(c.label)] = (s.rivalries[String(c.label)] ?? 0) + 5;
    } },
    { id: 'refuse', label: l('Recusar sem conversa', 'Refuse flatly'), apply: (s, _r, c) => {
      const a = s.acts[String(c.act)];
      if (!a) return;
      // quem é leal gosta de não ter sido vendido; quem escuta rivais fica curioso
      a.trust = clamp(a.trust + (prefsOf(s, a).loyalty >= 50 ? 2 : -3), 0, 100);
      s.rivalries[String(c.label)] = (s.rivalries[String(c.label)] ?? 0) + 8;
    } },
  ],
}];
deferEvents(BUYOUT_EVENTS);

// ---------------------------------------------------------------- efeitos e propostas

// aposta tecnológica: lançamentos do selo rendem mais enquanto o formato é novo
registerMod('appeal', 'rivals8', (s, v, c) => {
  const rel = c.release;
  if (!rel || rel.owner === 'player') return null;
  const bet = rivals8(s).tech[rel.owner];
  return bet && bet.until >= s.year ? { value: v * 1.12, label: l('Aposta tecnológica do selo', 'Label\'s tech bet') } : null;
});

registerOfferMod('rivals8', (s, a) => {
  const st = rivals8(s);
  const it = st.interest[a.id];
  if (it && s.labels[it.lb]?.active) return { delta: -0.06, reason: fmtL(l('{b} também está negociando, com contrato mais atraente.', '{b} is negotiating too, with a more attractive deal.'), { b: s.labels[it.lb].name }) };
  const key = `${a.city}:${a.genre}`;
  for (const [lbId, sc] of Object.entries(st.scene)) {
    if (sc !== key) continue;
    const lb = s.labels[lbId];
    if (lb?.active) return { delta: -0.04, reason: fmtL(l('A cena gira em torno de {b}.', 'The scene revolves around {b}.'), { b: lb.name }) };
  }
  return null;
});


// ---------------------------------------------------------------- manuais da rodada 9

const liveActs = (s: GameState, lb: Label): Act[] => lb.roster.map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status === 'active' && !a.deceased);
const famOf = (a: Act): FamilyId => familyOf(a.genre);

function idolFactory(s: GameState, r: Rng, lb: Label): void {
  const acts = liveActs(s, lb);
  if (r.chance(0.05)) {
    const g = acts.filter((a) => a.members.length >= 3 && a.fame < 30 && a.momentum < 60).sort((x, y) => x.fame - y.fame)[0];
    if (g && lb.cash > money(s, 40000)) {
      lb.cash -= money(s, 12000);
      g.momentum = clamp(g.momentum + 12, 0, 100);
      g.fans.casual += Math.round(g.fans.casual * 0.08) + 200;
      logMove(s, lb, { k: 'idol_debut', a: g.name });
    }
  }
  // trainees: assina jovens do pop com contrato longo
  if (r.chance(0.04) && lb.roster.length < 16) {
    const t0 = Object.values(s.acts).filter((a) => free(a) && a.fame < 12 && famOf(a) === 'pop' && a.members.every((id) => s.year - (s.persons[id]?.born ?? 0) < 25)).sort((x, y) => y.potential - x.potential)[0];
    if (t0 && lb.cash > money(s, expectedAdvance(s, t0) * 1.2)) { signWithRival(s, t0, lb.id, r); logMove(s, lb, { k: 'scene_sign', a: t0.name, x: `${t0.city}:${t0.genre}` }); }
  }
}

function gospelNetwork(s: GameState, r: Rng, lb: Label): void {
  if (!r.chance(0.04)) return;
  const a = liveActs(s, lb).filter((x) => famOf(x) === 'sacred').sort((x, y) => y.fans.core - x.fans.core)[0] ?? liveActs(s, lb)[0];
  if (!a) return;
  a.fans.core += Math.round(a.fans.core * 0.025) + 50;
  const v = money(s, 1500 + Math.min(20000, a.fans.core) * 0.1);
  lb.cash += v;
  lb.revenueYear += v;
  logMove(s, lb, { k: 'gospel_circuit', a: a.name });
}

function prestigeBoutique(s: GameState, r: Rng, lb: Label): void {
  if (!r.chance(0.035) || lb.cash < money(s, 60000)) return;
  const a = liveActs(s, lb).sort((x, y) => y.momentum - x.momentum)[0];
  if (!a) return;
  lb.cash -= money(s, 8000);
  a.fame = clamp(a.fame + 0.8, 0, 100);
  a.momentum = clamp(a.momentum + 4, 0, 100);
  logMove(s, lb, { k: 'prestige_award', a: a.name });
}

function syncHouse(s: GameState, r: Rng, lb: Label): void {
  if (!r.chance(0.05)) return;
  const a = liveActs(s, lb).sort((x, y) => y.fame - x.fame)[0];
  if (!a) return;
  const v = money(s, 2500 + a.fame * 80);
  lb.cash += v;
  lb.revenueYear += v;
  a.momentum = clamp(a.momentum + 3, 0, 100);
  logMove(s, lb, { k: 'sync_deal', a: a.name });
}

function regionalKing(s: GameState, r: Rng, lb: Label): void {
  const key = homeScene(s, lb);
  if (!r.chance(0.05)) return;
  const a = liveActs(s, lb).sort((x, y) => y.fans.active - x.fans.active)[0];
  if (!a) return;
  a.fans.core += Math.round(a.fans.active * 0.015) + 30;
  const k = key ?? `${a.city}:${a.genre}`;
  s.scenes[k] = (s.scenes[k] ?? 0) + 0.8;
  logMove(s, lb, { k: 'regional_tour', a: a.name });
  if (key && r.chance(0.5) && lb.roster.length < 14) {
    const t0 = sceneTargets(s, key).sort((x, y) => y.potential - x.potential)[0];
    if (t0 && lb.cash > money(s, expectedAdvance(s, t0) * 1.2)) { signWithRival(s, t0, lb.id, r); logMove(s, lb, { k: 'scene_sign', a: t0.name, x: key }); }
  }
}

function assetStripper(s: GameState, r: Rng, lb: Label): void {
  if (!r.chance(0.035) || lb.cash < money(s, 250000)) return;
  const sellers = Object.values(s.labels).filter((x) => x.active && x.id !== lb.id && x.cash < money(s, 90000) && x.family !== 'A');
  const seller = sellers.length ? r.pick(sellers) : undefined;
  if (!seller) return;
  const rels = Object.values(s.releases).filter((x) => x.owner === seller.id).sort((x, y) => y.totalUnits - x.totalUnits).slice(0, 5);
  const price = money(s, 1200 * Math.max(1, rels.length));
  for (const x of rels) x.owner = lb.id;
  lb.cash += Math.round(price * 0.6); // compra por `price` e revende em pedaços: o fundo só lucra desmontando
  seller.cash += price;
  const best = seller.roster.map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status === 'active' && !!a.contractId).sort((x, y) => y.fame - x.fame)[0];
  if (best) endContract(s, best, 'terminated');
  logMove(s, lb, { k: 'asset_strip', a: String(rels.length), x: seller.name });
}

function visionaryExec(s: GameState, r: Rng, lb: Label): void {
  if (!r.chance(0.03) || lb.cash < money(s, 120000) || lb.roster.length >= 14) return;
  const a = Object.values(s.acts).filter((x) => free(x) && x.positioning < 40 && x.fame < 35).sort((x, y) => y.potential - x.potential)[0];
  if (!a || lb.cash < money(s, expectedAdvance(s, a) * 1.2)) return;
  signWithRival(s, a, lb.id, r);
  logMove(s, lb, { k: 'visionary_bet', a: a.name });
}

function purist(s: GameState, r: Rng, lb: Label): void {
  if (!r.chance(0.03)) return;
  const a = liveActs(s, lb).sort((x, y) => y.fame - x.fame)[0];
  if (!a) return;
  a.trust = clamp(a.trust + 3, 0, 100);
  a.fame = clamp(a.fame + 0.4, 0, 100);
  a.momentum = clamp(a.momentum + 2, 0, 100);
  logMove(s, lb, { k: 'purist_refuse', a: a.name });
}

// ---------------------------------------------------------------- manuais da rodada 10

const marketOf = (city: string): MarketId | undefined => cityById[city]?.market;
const fits = (lb: Label, a: Act) => !lb.focus.length || lb.focus.includes(famOf(a));

function viralHunter(s: GameState, r: Rng, lb: Label): void {
  if (r.chance(0.06) && lb.roster.length < 24) {
    const a = Object.values(s.acts).filter((x) => free(x) && x.momentum >= 55 && x.fame < 25).sort((x, y) => y.momentum - x.momentum)[0];
    if (a && lb.cash > money(s, expectedAdvance(s, a) * 1.1)) {
      signWithRival(s, a, lb.id, r);
      const k = a.contractId ? s.contracts[a.contractId] : undefined;
      if (k) k.endWeek = Math.min(k.endWeek, s.week + 60);
      logMove(s, lb, { k: 'viral_grab', a: a.name });
    }
  }
  if (r.chance(0.04)) {
    const a = liveActs(s, lb).find((x) => {
      const k = x.contractId ? s.contracts[x.contractId] : undefined;
      return !!k && x.momentum < 25 && x.fame < 20 && s.week - k.startWeek < 110 && s.week - k.startWeek > 40;
    });
    if (a) { endContract(s, a, 'terminated'); logMove(s, lb, { k: 'viral_drop', a: a.name }); }
  }
}

function artistSchool(s: GameState, r: Rng, lb: Label): void {
  if (r.chance(0.04) && lb.roster.length < 16) {
    const a = Object.values(s.acts).filter((x) => free(x) && x.fame < 8 && fits(lb, x)).sort((x, y) => y.potential - x.potential)[0];
    if (a && lb.cash > money(s, expectedAdvance(s, a) * 1.1)) { signWithRival(s, a, lb.id, r); logMove(s, lb, { k: 'school_class', a: a.name }); }
  }
  if (r.chance(0.035)) {
    const a = liveActs(s, lb).filter((x) => { const k = x.contractId ? s.contracts[x.contractId] : undefined; return !!k && s.week - k.startWeek >= 104 && x.fame < 30; })
      .sort((x, y) => y.potential - x.potential)[0];
    if (a) {
      const k = s.contracts[a.contractId!];
      a.fame = clamp(a.fame + 2.5, 0, 100);
      a.momentum = clamp(a.momentum + 8, 0, 100);
      a.fans.casual += Math.round(a.fans.casual * 0.1) + 300;
      logMove(s, lb, { k: 'school_grad', a: a.name, x: String(Math.max(2, Math.round((s.week - k.startWeek) / 52))) });
    }
  }
}

function royaltyFund(s: GameState, r: Rng, lb: Label): void {
  if (r.chance(0.03) && lb.cash > money(s, 200000)) {
    const sellers = Object.values(s.labels).filter((x) => x.active && x.id !== lb.id && playbookOf(x) !== 'royalty');
    const seller = sellers.length ? r.pick(sellers) : undefined;
    const rels = seller ? Object.values(s.releases).filter((x) => x.owner === seller.id && s.year - x.year >= 3).sort((x, y) => y.totalUnits - x.totalUnits).slice(0, 4) : [];
    if (seller && rels.length) {
      const price = money(s, 4000 * rels.length);
      for (const x of rels) x.owner = lb.id;
      lb.cash -= price;
      seller.cash += price;
      logMove(s, lb, { k: 'royalty_buy', a: String(rels.length), x: seller.name });
    }
  }
  if (r.chance(0.06)) {
    const n = Object.values(s.releases).filter((x) => x.owner === lb.id && s.year - x.year >= 3).length;
    if (n >= 2) {
      const v = money(s, 300 * Math.min(n, 40));
      lb.cash += v;
      lb.revenueYear += v;
      logMove(s, lb, { k: 'royalty_yield', a: String(n) });
    }
  }
}

function mediaConglomerate(s: GameState, r: Rng, lb: Label): void {
  if (r.chance(0.045) && lb.cash > money(s, 80000)) {
    const a = liveActs(s, lb).sort((x, y) => y.momentum - x.momentum)[0];
    if (a) {
      lb.cash -= money(s, 10000);
      a.fame = clamp(a.fame + 1.2, 0, 100);
      a.momentum = clamp(a.momentum + 8, 0, 100);
      a.fans.casual += Math.round(a.fans.casual * 0.05) + 200;
      logMove(s, lb, { k: 'media_push', a: a.name });
    }
  }
  if (r.chance(0.015) && lb.cash > money(s, 800000)) {
    const small = Object.values(s.labels).filter((x) => x.active && x.id !== lb.id && x.family === 'B' && x.cash < money(s, 120000) && x.roster.length > 0);
    const seller = small.length ? r.pick(small) : undefined;
    if (!seller) return;
    const best = seller.roster.map((id) => s.acts[id]).filter((a): a is Act => !!a && a.owner === seller.id && a.status === 'active').sort((x, y) => y.fame - x.fame).slice(0, 2);
    if (!best.length) return;
    const price = money(s, 30000 * best.length);
    lb.cash -= price;
    seller.cash += price;
    for (const a of best) { endContract(s, a, 'terminated'); signWithRival(s, a, lb.id, r); }
    logMove(s, lb, { k: 'media_absorb', a: best.map((a) => a.name).join(', '), x: seller.name });
  }
}

function hitImporter(s: GameState, r: Rng, lb: Label): void {
  const home = marketOf(lb.city);
  if (r.chance(0.05) && lb.roster.length < 20) {
    const a = Object.values(s.acts).filter((x) => free(x) && x.fame >= 12 && marketOf(x.city) !== home).sort((x, y) => y.fame - x.fame)[0];
    if (a && lb.cash > money(s, expectedAdvance(s, a) * 1.2)) {
      signWithRival(s, a, lb.id, r);
      logMove(s, lb, { k: 'import_hit', a: a.name, x: marketOf(a.city) ?? '' });
    }
  }
  if (r.chance(0.03)) {
    const e = s.charts.singles.slice(0, 20).map((c) => s.releases[c.releaseId]).find((x) => x && x.owner !== lb.id && s.acts[x.actId] && marketOf(s.acts[x.actId].city) !== home);
    if (e) {
      const v = money(s, 3000);
      lb.cash += v;
      lb.revenueYear += v;
      logMove(s, lb, { k: 'import_license', a: e.title });
    }
  }
}

function sceneAgitator(s: GameState, r: Rng, lb: Label): void {
  const key = homeScene(s, lb);
  if (r.chance(0.05)) {
    const k = key ?? `${lb.city}:${liveActs(s, lb)[0]?.genre ?? ''}`;
    if (k.split(':')[1]) {
      s.scenes[k] = (s.scenes[k] ?? 0) + 1.2;
      for (const a of liveActs(s, lb)) if (`${a.city}:${a.genre}` === k) a.fans.core += Math.round(a.fans.core * 0.02) + 20;
      logMove(s, lb, { k: 'scene_night', x: k });
    }
  }
  if (r.chance(0.03) && lb.roster.length < 14) {
    const a = Object.values(s.acts).filter((x) => free(x) && x.fame < 20 && fits(lb, x) && x.positioning < 45).sort((x, y) => y.potential - x.potential)[0];
    if (a && lb.cash > money(s, expectedAdvance(s, a) * 1.1)) { signWithRival(s, a, lb.id, r); logMove(s, lb, { k: 'agitator_sign', a: a.name }); }
  }
  if (r.chance(0.015)) {
    const major = Object.values(s.labels).filter((x) => x.active && x.family === 'A' && x.id !== lb.id).sort((x, y) => y.revenueLastYear - x.revenueLastYear)[0];
    if (major) {
      for (const a of liveActs(s, lb)) a.trust = clamp(a.trust + 2, 0, 100);
      logMove(s, lb, { k: 'major_attack', x: major.name });
    }
  }
}

function trendCopycat(s: GameState, r: Rng, lb: Label): void {
  if (!r.chance(0.05)) return;
  const top = s.charts.singles[0] ? s.releases[s.charts.singles[0].releaseId] : undefined;
  const topAct = top ? s.acts[top.actId] : undefined;
  if (!top || !topAct || top.owner === lb.id) return;
  const fam = famOf(topAct);
  const mine = liveActs(s, lb).filter((a) => famOf(a) === fam && unreleasedRecorded(s, a).length > 0).sort((x, y) => y.fame - x.fame)[0];
  if (mine && lb.cash > money(s, 60000)) {
    const songs = unreleasedRecorded(s, mine).sort((x, y) => y.q - x.q);
    const budget = 8000 * (0.5 + mine.fame / 40);
    lb.cash -= money(s, budget);
    launchNpcRelease(s, r, mine, lb.id, [songs[0].id], 'single', budget);
    logMove(s, lb, { k: 'copy_clone', a: mine.name, x: top.title });
    return;
  }
  if (lb.roster.length < 20) {
    const a = Object.values(s.acts).filter((x) => free(x) && famOf(x) === fam && x.fame < 15).sort((x, y) => y.potential - x.potential)[0];
    if (a && lb.cash > money(s, expectedAdvance(s, a) * 1.1)) { signWithRival(s, a, lb.id, r); logMove(s, lb, { k: 'copy_sign', a: a.name }); }
  }
}

function budgetLabel(s: GameState, r: Rng, lb: Label): void {
  if (r.chance(0.06)) {
    const n = Math.min(14, Object.values(s.releases).filter((x) => x.owner === lb.id && s.year - x.year >= 2).length);
    if (n >= 3) {
      const v = money(s, 800 * n);
      lb.cash += v;
      lb.revenueYear += v;
      logMove(s, lb, { k: 'budget_comp', a: String(n), x: String(s.year - 1) });
    }
  }
  if (r.chance(0.05) && lb.roster.length < 24) {
    const a = Object.values(s.acts).filter((x) => free(x) && x.fame < 6 && x.fame > 1).sort((x, y) => y.fame - x.fame)[0];
    if (a && lb.cash > money(s, 20000)) {
      signWithRival(s, a, lb.id, r);
      const k = a.contractId ? s.contracts[a.contractId] : undefined;
      if (k) { k.advance = 0; k.royalty = Math.min(k.royalty, 0.1); }
      logMove(s, lb, { k: 'budget_sign', a: a.name });
    }
  }
}

const RUN: Record<PlaybookId, (s: GameState, r: Rng, lb: Label, all: Act[]) => void> = {
  viral: (s, r, lb) => viralHunter(s, r, lb), school: (s, r, lb) => artistSchool(s, r, lb), royalty: (s, r, lb) => royaltyFund(s, r, lb),
  conglomerate: (s, r, lb) => mediaConglomerate(s, r, lb), importer: (s, r, lb) => hitImporter(s, r, lb), agitator: (s, r, lb) => sceneAgitator(s, r, lb),
  copycat: (s, r, lb) => trendCopycat(s, r, lb), budget: (s, r, lb) => budgetLabel(s, r, lb),
  vulture, scene: (s, r, lb) => sceneOwner(s, r, lb), catalog: (s, r, lb) => catalogKeeper(s, r, lb), tech: (s, r, lb) => techBettor(s, r, lb), live: (s, r, lb) => stageAndFans(s, r, lb),
  idol: (s, r, lb) => idolFactory(s, r, lb), gospel: (s, r, lb) => gospelNetwork(s, r, lb), prestige: (s, r, lb) => prestigeBoutique(s, r, lb), sync: (s, r, lb) => syncHouse(s, r, lb),
  regional: (s, r, lb) => regionalKing(s, r, lb), fund: (s, r, lb) => assetStripper(s, r, lb), visionary: (s, r, lb) => visionaryExec(s, r, lb), purist: (s, r, lb) => purist(s, r, lb),
};

// perfis de identidade valem para os rivais: o mesmo apelo dos perfis do jogador, com força fixa
const CORE_APPEAL: Partial<Record<ProfileId, (rel: Release, act: Act) => number>> = {
  hits: (rel) => (rel.reissueOf ? 0.92 : 1.06), catalog: (rel) => (rel.reissueOf ? 1.12 : 1), export: (rel) => (rel.territories.length >= 2 ? 1.05 : 1),
  dev: (_r, act) => (act.releases.length <= 1 ? 1.05 : 1), live: (rel) => (rel.kind === 'live' ? 1.1 : 1), scene: (_r, act) => (act.fame < 30 ? 1.04 : 1),
};
registerMod('appeal', 'rivals8profile', (s, v, c) => {
  const rel = c.release;
  if (!rel || rel.owner === 'player' || rel.owner === 'indie') return null;
  const lb = s.labels[rel.owner];
  const act = s.acts[rel.actId];
  if (!lb?.active || !act) return null;
  const pf = rivalProfile(lb);
  const xf = XBY_ID[pf];
  const m = xf?.appeal ? adj(xf.appeal(s, rel, act, envOf(s, liveActs(s, lb), false)), 0.7) : (CORE_APPEAL[pf]?.(rel, act) ?? 1);
  return Math.abs(m - 1) < 0.005 ? null : { value: v * m, label: fmtL(l('Perfil do selo: {p}', 'Label profile: {p}'), { p: XBY_ID[pf]?.def.name ?? l(pf, pf) }) };
});

// ---------------------------------------------------------------- tick

registerSimHook('month', 'rivals8', (s, r) => {
  const all = Object.values(s.acts);
  for (const lb of Object.values(s.labels)) {
    if (!lb.active) continue;
    RUN[playbookOf(lb)](s, r, lb, all);
  }
  resolveInterest(s, r);
  const st = rivals8(s);
  for (const id of Object.keys(st.log)) if (!s.labels[id]?.active) delete st.log[id];
  for (const id of Object.keys(st.scene)) if (!s.labels[id]?.active) delete st.scene[id];
  for (const id of Object.keys(st.clash)) if (!s.pendingReleases.some((p) => p.id === id)) delete st.clash[id];
});

// antecipar a data: Abutre e Tecnologia colocam um single forte na semana do lançamento do jogador
registerSimHook('week', 'rivals8', (s, r) => {
  const st = rivals8(s);
  if (s.week - st.lastClash < 16 || !s.pendingReleases.length) return;
  for (const pr of s.pendingReleases) {
    const d = pr.week - s.week;
    if (d < 1 || d > 3 || st.clash[pr.id]) continue;
    const mineAct = s.acts[pr.actId];
    if (!mineAct || (mineAct.owner !== 'player' && !mineAct.playerBand)) continue;
    st.clash[pr.id] = 1;
    if (!r.chance(0.3)) continue;
    const fam = familyOf(mineAct.genre);
    const labels = Object.values(s.labels).filter((lb) => lb.active && lb.cash > money(s, 100000) && (playbookOf(lb) === 'vulture' || playbookOf(lb) === 'tech'));
    for (const lb of r.shuffle(labels)) {
      const act = lb.roster.map((id) => s.acts[id]).filter((a) => a && a.status === 'active' && familyOf(a.genre) === fam && unreleasedRecorded(s, a).length > 0).sort((x, y) => y.fame - x.fame)[0];
      if (!act) continue;
      const songs = unreleasedRecorded(s, act).sort((x, y) => y.q - x.q);
      const budget = 12000 * (0.5 + act.fame / 40);
      lb.cash -= money(s, budget);
      launchNpcRelease(s, r, act, lb.id, [songs[0].id], 'single', budget);
      st.lastClash = s.week;
      logMove(s, lb, { k: 'date_move', a: act.name, x: pr.title });
      s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 4;
      notify(s, fmtL(l('{b} antecipou o lançamento de {a} para a semana do seu "{t}". Mudar a data ou reforçar a divulgação?', '{b} moved {a}\'s release into the week of your "{t}". Move your date or boost promotion?'), { b: lb.name, a: act.name, t: pr.title }), 'bad');
      break;
    }
    if (st.lastClash === s.week) break;
  }
});

// abandonar um mercado quando o caixa aperta (o espaço fica aberto para quem chegar)
registerSimHook('year', 'rivals8', (s, r) => {
  for (const lb of Object.values(s.labels)) {
    if (!lb.active || lb.territories.length < 3) continue;
    if (lb.cash > money(s, 250000) && lb.revenueLastYear > money(s, 100000)) continue;
    if (!r.chance(0.5)) continue;
    const home = cityById[lb.city]?.market;
    const drop = [...lb.territories].reverse().find((m) => m !== home);
    if (!drop) continue;
    lb.territories = lb.territories.filter((m) => m !== drop);
    logMove(s, lb, { k: 'abandon', x: drop });
    if (s.player.territories.includes(drop)) notify(s, fmtL(l('{b} abandonou o mercado {m}: há espaço aberto.', '{b} abandoned the {m} market: there is room now.'), { b: lb.name, m: marketById[drop].name }), 'info');
  }
});
