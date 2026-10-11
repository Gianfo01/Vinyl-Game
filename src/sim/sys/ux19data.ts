// Rodada 19 (Frente 8, onda 4: P3, P8, P12, 11.13, 11.14) — DADOS da experiência: metas de abertura e de era
// (inclusive 1889), as 6 cadeias de história da Frente 9 como conquistas, legados entre partidas e as áreas que
// aparecem aos poucos no menu (divulgação progressiva). Puro: sem estado, sem sorteio.

import { l, type L } from '../../data/world';

/** Modelo de meta: `n` é o alvo; o texto usa {n}. */
export type GoalTpl19 = 'rel' | 'lp' | 'single' | 'top10' | 'n1' | 'sign' | 'reserve' | 'fans' | 'art' | 'terr' | 'fam' | 'noLoan' | 'comm';
export interface GoalSpec19 { tpl: GoalTpl19; n: number; t: L; fam?: string; months: number }
const G = (tpl: GoalTpl19, n: number, pt: string, en: string, months = 36, fam?: string): GoalSpec19 => ({ tpl, n, t: l(pt, en), months, fam });

/** Faixas de época (ano inicial da faixa) → 5 metas; a abertura usa as 3 primeiras, as viradas rodam o resto. */
export const ERA_GOALS19: { from: number; name: L; goals: GoalSpec19[] }[] = [
  { from: 0, name: l('Era dos cilindros', 'Cylinder era'), goals: [
    G('rel', 3, 'Gravar e vender {n} cilindros ou discos', 'Record and sell {n} cylinders or discs', 24),
    G('reserve', 6, 'Guardar caixa para {n} meses (patentes e quebras custam caro)', 'Keep {n} months of cash (patents and breakage are costly)', 24),
    G('sign', 2, 'Contratar {n} artistas do vaudeville ou da banda da praça', 'Sign {n} vaudeville or bandstand artists', 24),
    G('art', 35, 'Ganhar nome entre os músicos (reputação artística {n})', 'Earn a name among musicians (artistic reputation {n})'),
    G('fans', 2000, 'Somar {n} fãs no elenco', 'Reach {n} fans across the roster') ] },
  { from: 1900, name: l('Goma-laca e partituras', 'Shellac and sheet music'), goals: [
    G('rel', 4, 'Lançar {n} discos de 78 rotações', 'Release {n} 78 rpm discs'),
    G('top10', 1, 'Colocar um disco no top 10', 'Put a record in the top 10'),
    G('sign', 2, 'Assinar {n} artistas novos', 'Sign {n} new artists'),
    G('fam', 1, 'Ter um artista de jazz ou blues no elenco', 'Have a jazz or blues artist on the roster', 36, 'blues_jazz'),
    G('reserve', 6, 'Atravessar a crise com {n} meses de caixa', 'Ride out the crisis with {n} months of cash') ] },
  { from: 1925, name: l('Microfone e rádio', 'Microphone and radio'), goals: [
    G('rel', 4, 'Lançar {n} discos com gravação elétrica', 'Release {n} electrically recorded discs'),
    G('fans', 5000, 'Chegar a {n} fãs com o rádio a favor', 'Reach {n} fans with radio on your side'),
    G('top10', 1, 'Emplacar um sucesso no top 10', 'Land a top 10 hit'),
    G('noLoan', 1, 'Fechar a década sem dívida no banco', 'Close the decade with no bank debt'),
    G('art', 45, 'Reputação artística {n}: o selo das big bands', 'Artistic reputation {n}: the big band label') ] },
  { from: 1948, name: l('LP e compacto', 'LP and the 45'), goals: [
    G('lp', 1, 'Lançar o primeiro LP do selo', 'Release the label\'s first LP'),
    G('single', 2, 'Lançar {n} compactos para as jukeboxes', 'Release {n} singles for the jukeboxes'),
    G('top10', 1, 'Chegar ao top 10', 'Reach the top 10'),
    G('sign', 2, 'Assinar {n} vozes novas', 'Sign {n} new voices'),
    G('reserve', 6, 'Ter {n} meses de caixa', 'Hold {n} months of cash') ] },
  { from: 1955, name: l('Rock\'n\'roll', 'Rock\'n\'roll'), goals: [
    G('fam', 1, 'Assinar um ato de rock\'n\'roll antes dos rivais', 'Sign a rock\'n\'roll act before the rivals', 24, 'rock'),
    G('single', 3, 'Lançar {n} compactos para o rádio Top 40', 'Release {n} singles for Top 40 radio'),
    G('n1', 1, 'Chegar ao nº 1', 'Reach number 1'),
    G('fans', 20000, 'Somar {n} fãs jovens', 'Reach {n} young fans'),
    G('terr', 2, 'Vender em {n} mercados', 'Sell in {n} markets') ] },
  { from: 1967, name: l('Álbum, FM e arenas', 'Album, FM and arenas'), goals: [
    G('lp', 2, 'Lançar {n} LPs (o álbum virou obra)', 'Release {n} LPs (the album became art)'),
    G('art', 55, 'Reputação artística {n}', 'Artistic reputation {n}'),
    G('top10', 2, 'Ter {n} discos no top 10', 'Have {n} records in the top 10'),
    G('terr', 3, 'Vender em {n} mercados', 'Sell in {n} markets'),
    G('reserve', 6, 'Segurar {n} meses de caixa para o choque do petróleo', 'Hold {n} months of cash for the oil shock') ] },
  { from: 1981, name: l('Clipes e CD', 'Music videos and CD'), goals: [
    G('n1', 1, 'Um nº 1 na era da imagem', 'A number 1 in the age of image'),
    G('fans', 60000, 'Chegar a {n} fãs', 'Reach {n} fans'),
    G('comm', 55, 'Reputação comercial {n}', 'Commercial reputation {n}'),
    G('lp', 2, 'Lançar {n} álbuns em CD', 'Release {n} albums on CD'),
    G('terr', 3, 'Estar em {n} mercados', 'Be present in {n} markets') ] },
  { from: 1999, name: l('Napster e o download', 'Napster and downloads'), goals: [
    G('reserve', 9, 'Ter {n} meses de caixa: o disco físico vai cair', 'Hold {n} months of cash: physical sales will fall'),
    G('noLoan', 1, 'Atravessar a pirataria sem dívida', 'Get through piracy with no debt'),
    G('sign', 2, 'Assinar {n} artistas que vivem de palco', 'Sign {n} artists who live on stage'),
    G('top10', 1, 'Emplacar um top 10 mesmo assim', 'Land a top 10 anyway'),
    G('art', 50, 'Reputação artística {n}', 'Artistic reputation {n}') ] },
  { from: 2008, name: l('Streaming', 'Streaming'), goals: [
    G('single', 4, 'Lançar {n} singles (as playlists pedem frequência)', 'Release {n} singles (playlists want frequency)'),
    G('fans', 100000, 'Chegar a {n} fãs', 'Reach {n} fans'),
    G('top10', 1, 'Entrar no top 10', 'Get into the top 10'),
    G('terr', 4, 'Estar em {n} mercados (o mundo é um só catálogo)', 'Be in {n} markets (the world is one catalog)'),
    G('reserve', 6, 'Ter {n} meses de caixa', 'Hold {n} months of cash') ] },
  { from: 2016, name: l('Vídeo curto e IA', 'Short video and AI'), goals: [
    G('single', 5, 'Lançar {n} faixas curtas', 'Release {n} short tracks'),
    G('fans', 150000, 'Chegar a {n} fãs', 'Reach {n} fans'),
    G('art', 60, 'Reputação artística {n}: autenticidade vende', 'Artistic reputation {n}: authenticity sells'),
    G('n1', 1, 'Chegar ao nº 1', 'Reach number 1'),
    G('noLoan', 1, 'Crescer sem dívida', 'Grow without debt') ] },
];
export const eraBand19 = (y: number) => [...ERA_GOALS19].reverse().find((b) => y >= b.from) ?? ERA_GOALS19[0];

/** Viradas fixas pedidas pelo plano (além de cada década e de cada era de negócio do eras8). */
export const KEY_TECH19 = ['electric_rec', 'lp', 'multitrack', 'clipnet', 'p2p', 'streaming', 'short_video'];

/** As 6 cadeias de história da Frente 9 (plano19 §9). Conquista: 3+ elos na mesma partida; completa: todos. */
export interface Chain19 { id: string; name: L; steps: { k: string[]; t: L }[] }
export const CHAINS19: Chain19[] = [
  { id: 'c1', name: l('A banda acabou, o show continua', 'The band ended, the show goes on'), steps: [
    { k: ['split'], t: l('a banda se separa', 'the band splits') }, { k: ['tribute_born'], t: l('surgem tributos', 'tributes appear') },
    { k: ['soundalike_hired'], t: l('o sósia é contratado', 'the soundalike is hired') }, { k: ['release#documentary'], t: l('documentário', 'documentary') },
    { k: ['session_credit', 'session_lawsuit'], t: l('o músico de estúdio cobra crédito', 'the session player claims credit') }] },
  { id: 'c2', name: l('O fracasso que virou clássico', 'The flop that became a classic'), steps: [
    { k: ['remix_hit'], t: l('remix de clube', 'club remix') }, { k: ['ad_sync', 'jingle'], t: l('comercial', 'commercial') },
    { k: ['needle_drop'], t: l('série ou filme', 'series or film') }, { k: ['revival_hit'], t: l('revival', 'revival') },
    { k: ['late_cert'], t: l('certificação tardia', 'late certification') }] },
  { id: 'c3', name: l('Do coral ao escândalo', 'From the choir to the scandal'), steps: [
    { k: ['choir_alumni', 'prodigy_found'], t: l('garoto do coral', 'choir kid') }, { k: ['contest_winner', 'contest_final'], t: l('concurso de TV', 'TV contest') },
    { k: ['cowrite_split'], t: l('camp de composição', 'songwriting camp') }, { k: ['ghostwriter_revealed'], t: l('o ghostwriter revela tudo', 'the ghostwriter tells all') }] },
  { id: 'c4', name: l('Caridade e cobiça', 'Charity and greed'), steps: [
    { k: ['world_crisis'], t: l('crise mundial', 'world crisis') }, { k: ['charity_show', 'charity_single'], t: l('show beneficente', 'benefit show') },
    { k: ['charity_scandal'], t: l('o dinheiro some', 'the money vanishes') }, { k: ['case_ruling'], t: l('investigação e sentença', 'investigation and ruling') }] },
  { id: 'c5', name: l('A guitarra que virou relíquia', 'The guitar that became a relic'), steps: [
    { k: ['gear_endorse', 'signature_model'], t: l('instrumento-assinatura', 'signature instrument') }, { k: ['death'], t: l('o artista morre', 'the artist dies') },
    { k: ['icon_instrument', 'relic'], t: l('relíquia e leilão', 'relic and auction') }, { k: ['estate_suit'], t: l('herdeiros brigam', 'heirs fight') },
    { k: ['hologram', 'avatar_residency'], t: l('holograma ou tributo oficial', 'hologram or official tribute') }] },
  { id: 'c6', name: l('Do fanzine à lei', 'From the fanzine to the law'), steps: [
    { k: ['zine_founded', 'zine_scene'], t: l('o fanzine cria a cena', 'the fanzine creates the scene') }, { k: ['scene_boom'], t: l('corrida do ouro', 'gold rush') },
    { k: ['ghost_band', 'soundalike_hired'], t: l('bandas-fantasma e sósias', 'ghost bands and soundalikes') }, { k: ['law'], t: l('lei nova', 'new law') }] },
];

/** Legado opcional para a próxima partida (cosmético ou vantagem pequena). `need` = partidas terminadas. */
export interface Heir19 { id: string; name: L; desc: L; need: number; chain?: number; cosmetic?: boolean }
export const HEIRS19: Heir19[] = [
  { id: 'crest', name: l('Brasão da casa', 'House crest'), desc: l('Só cosmético: o nome da partida anterior aparece no epitáfio e no Cockpit.', 'Cosmetic only: the previous run\'s name shows on the epitaph and the Cockpit.'), need: 1, cosmetic: true },
  { id: 'cash', name: l('Poupança da família', 'Family savings'), desc: l('+5% de caixa inicial (aporte do dono, financiamento).', '+5% starting cash (owner capital, financing).'), need: 1 },
  { id: 'rep', name: l('Sobrenome conhecido', 'Known surname'), desc: l('+2 em cada reputação no começo.', '+2 to each reputation at the start.'), need: 2 },
  { id: 'ear', name: l('Caderno de contatos', 'Contact book'), desc: l('2 talentos da sua cidade já aparecem no radar.', '2 talents from your city already show on the radar.'), need: 2, chain: 1 },
];

/** Divulgação progressiva: área → meses de jogo para abrir sozinha (ou antes, pelo gatilho do sistema em ux19.ts). */
export const DISC19: Record<string, number> = {
  long18: 3, talent18: 3, managers14: 3, producers15: 3, cal17: 3, labels: 3, agenda17: 3,
  rights18: 6, supply18: 6, dyn18: 6, live19: 6, industry: 6, critics: 6, night14: 6, scenes17: 6, wealth: 6, contracts19: 9,
  dm18: 12, after18: 12, society18: 12, regions18: 12, regions19: 12, market19a: 12, firm19: 12, world17: 12, movements: 12,
  crime: 18, zines19: 18, fakes19: 18,
  tribute19: 24, media19: 24, rockhall: 24, lendas: 24,
};
