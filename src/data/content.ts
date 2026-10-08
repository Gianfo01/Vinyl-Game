// Conteúdo expandido (dados tipados) para os sistemas novos: plataformas, veículos e críticos,
// produtores, marcas e clientes de sync, premiações, movimentos culturais, geopolítica,
// eras tecnológicas e paradas.
//
// Tudo é FICTÍCIO. Por decisão do dono do projeto, instituições, veículos, plataformas,
// marcas, paradas, festivais e premiações trazem `realRef` (o equivalente real), para a
// interface mostrar "Nome (≈ Referência)". Pessoas (críticos, produtores) NUNCA têm referência real.

import { l, type FamilyId, type L, type MarketId } from './world';

/** Utilitário: itens ativos num ano (start/end inclusivos). */
export function activeIn<T extends { start: number; end?: number }>(xs: T[], year: number): T[] {
  return xs.filter((x) => x.start <= year && (x.end === undefined || x.end >= year));
}

/** "Nome (≈ referência real)". */
export function displayName(x: { name: string; realRef?: string }): string {
  return x.realRef ? `${x.name} (≈ ${x.realRef})` : x.name;
}

const ALL: MarketId[] = ['na', 'eu', 'br', 'latam', 'asia', 'africa', 'oceania'];

// =====================================================================================
// PLATAFORMAS de mídia e distribuição
// =====================================================================================
export type PlatformType =
  | 'radio_network' | 'tv_channel' | 'music_tv' | 'jukebox_network' | 'mail_order' | 'p2p' | 'download_store'
  | 'streaming' | 'video_site' | 'short_video' | 'ringtone_store' | 'social' | 'live_stream' | 'voice_market' | 'neural_feed';

export interface PlatformDef {
  id: string;
  name: string;
  realRef?: string;
  type: PlatformType;
  desc: L;
  launch: number;
  close?: number;
  markets: MarketId[];
  /** alcance 0..100 no auge */
  reach: number;
  /** pagamento relativo ao detentor de direitos (0 = nada, 1 = melhor da era) */
  payout: number;
  /** id de TECHS que precisa existir para a plataforma surgir */
  tech?: string;
}

const pf = (id: string, name: string, realRef: string | undefined, type: PlatformType, launch: number, close: number | undefined, markets: MarketId[], reach: number, payout: number, pt: string, en: string, tech?: string): PlatformDef =>
  ({ id, name, realRef, type, desc: l(pt, en), launch, close, markets, reach, payout, tech });

export const PLATFORMS: PlatformDef[] = [
  pf('onda_network', 'Rádio Mundial Onda', 'NBC Radio Network', 'radio_network', 1926, undefined, ['na', 'eu', 'latam'], 80, 0.4, 'Rede de rádio nacional; programas patrocinados e orquestras ao vivo.', 'National radio network; sponsored shows and live orchestras.', 'radio'),
  pf('cnr', 'Corporação Nacional de Radiodifusão', 'BBC', 'radio_network', 1922, undefined, ['eu', 'oceania', 'africa'], 70, 0.5, 'Rádio pública com cotas e comitê de execução.', 'Public broadcaster with quotas and a playlist committee.', 'radio'),
  pf('radio_nacional_br', 'Rádio Continental', 'Rádio Nacional', 'radio_network', 1936, 1975, ['br'], 85, 0.4, 'A rádio dos auditórios, das novelas e das rainhas do rádio.', 'The radio of live audiences, soaps and radio queens.', 'radio'),
  pf('jukenet', 'JukeNet Operators', 'Seeburg / Wurlitzer route operators', 'jukebox_network', 1934, 1985, ['na', 'eu', 'latam', 'oceania'], 55, 0.3, 'Rotas de jukebox em bares e lanchonetes; o operador escolhe o disco.', 'Jukebox routes in bars and diners; the operator picks the record.'),
  pf('club_disco', 'Club do Disco', 'Columbia House', 'mail_order', 1955, 2009, ['na', 'br'], 40, 0.35, 'Clube por correspondência: 12 discos por um centavo.', 'Mail-order club: 12 records for a penny.'),
  pf('variety_tv', 'Canal Gala', 'CBS (era de variedades)', 'tv_channel', 1948, undefined, ['na'], 90, 0.3, 'TV aberta de variedades com convidados musicais.', 'Broadcast variety TV with musical guests.', 'tv_music'),
  pf('tv_tupi_like', 'TV Bandeirante', 'TV Tupi / TV Record', 'tv_channel', 1950, 1980, ['br'], 80, 0.3, 'Programas de auditório e festivais da canção.', 'Live-audience shows and song festivals.', 'tv_music'),
  pf('telenovela_net', 'Rede Horizonte', 'TV Globo', 'tv_channel', 1965, undefined, ['br', 'latam'], 95, 0.5, 'Novelas cuja trilha vira disco de ouro.', 'Soap operas whose soundtracks go gold.', 'tv_music'),
  pf('clipnet', 'ClipNet', 'MTV', 'music_tv', 1981, undefined, ALL, 90, 0.2, 'Rede de clipes 24 horas; o visual decide a carreira.', '24-hour music video network; looks decide careers.', 'clipnet'),
  pf('clipnet_latino', 'ClipNet Latino', 'MTV Latino / MTV Brasil', 'music_tv', 1990, 2013, ['latam', 'br'], 70, 0.2, 'Clipes com VJs locais e acústicos.', 'Videos with local VJs and unplugged sets.', 'clipnet'),
  pf('vh_classic', 'Canal Retrô', 'VH1', 'music_tv', 1985, undefined, ['na', 'eu'], 50, 0.2, 'Clipes adultos, documentários e nostalgia.', 'Adult videos, documentaries and nostalgia.', 'clipnet'),
  pf('sharewave', 'ShareWave', 'Napster', 'p2p', 1999, 2003, ALL, 80, 0, 'Troca gratuita de MP3; vendas despencam.', 'Free MP3 swapping; sales collapse.', 'p2p'),
  pf('mulewire', 'MuleWire', 'LimeWire / eMule / Kazaa', 'p2p', 2001, 2010, ALL, 70, 0, 'Sucessores descentralizados: impossíveis de fechar.', 'Decentralized successors: impossible to shut down.', 'p2p'),
  pf('torrentbay', 'TorrentBay', 'The Pirate Bay', 'p2p', 2003, undefined, ALL, 60, 0, 'Discografias inteiras num clique.', 'Whole discographies in one click.', 'p2p'),
  pf('tuneshop', 'TuneShop', 'iTunes Store', 'download_store', 2003, undefined, ALL, 70, 0.8, 'Faixa a 99 centavos; o álbum vira opcional.', '99-cent tracks; the album becomes optional.', 'download'),
  pf('ringtone_mart', 'ToqueMania', 'Jamster / lojas de ringtones das operadoras', 'ringtone_store', 2002, 2012, ALL, 65, 0.6, 'Ringtones de 30 segundos valem mais que o single.', '30-second ringtones outearn the single.', 'download'),
  pf('pocket_radio', 'Pocket Radio', 'Pandora', 'streaming', 2005, undefined, ['na', 'oceania'], 40, 0.3, 'Rádio personalizada por algoritmo.', 'Algorithmic personalized radio.', 'internet'),
  pf('kaleido', 'Kaleido', 'YouTube', 'video_site', 2005, undefined, ALL, 95, 0.25, 'Vídeo sob demanda; clipes virais e covers.', 'On-demand video; viral clips and covers.', 'internet'),
  pf('myplace', 'MyPlace', 'MySpace', 'social', 2003, 2012, ALL, 70, 0, 'Perfis com player; bandas descobertas pelo top 8.', 'Profiles with players; bands found via top 8.', 'internet'),
  pf('streamhaven', 'Streamhaven', 'Spotify', 'streaming', 2008, undefined, ALL, 95, 0.55, 'Assinatura e plano grátis; playlists editoriais mandam.', 'Subscription and free tier; editorial playlists rule.', 'streaming'),
  pf('orchard', 'Orchard Music', 'Apple Music', 'streaming', 2015, undefined, ALL, 70, 0.65, 'Streaming de ecossistema fechado; paga um pouco mais.', 'Walled-garden streaming; pays a bit more.', 'streaming'),
  pf('tidepool', 'TidePool', 'Tidal', 'streaming', 2014, undefined, ['na', 'eu'], 25, 0.8, 'Alta fidelidade e dono-artista.', 'Hi-fi and artist-owned.', 'streaming'),
  pf('audiodrift', 'AudioDrift', 'SoundCloud', 'streaming', 2007, undefined, ALL, 45, 0.15, 'Upload livre; berço de microgêneros.', 'Free upload; cradle of microgenres.', 'internet'),
  pf('bandhaus', 'Bandhaus', 'Bandcamp', 'download_store', 2008, undefined, ALL, 20, 0.95, 'Venda direta, fãs pagam mais que o preço.', 'Direct sales; fans pay more than asked.', 'internet'),
  pf('chirper', 'Chirper', 'Twitter / X', 'social', 2006, undefined, ALL, 70, 0, 'Frases curtas, brigas longas.', 'Short posts, long feuds.', 'internet'),
  pf('facewall', 'FaceWall', 'Facebook / Instagram', 'social', 2004, undefined, ALL, 90, 0, 'Rede social de massa; anúncios segmentados.', 'Mass social network; targeted ads.', 'internet'),
  pf('liveloop', 'LiveLoop', 'Twitch', 'live_stream', 2011, undefined, ALL, 55, 0.3, 'Transmissões ao vivo com gorjetas.', 'Live streams with tips.', 'streaming'),
  pf('loopit', 'Loopit', 'TikTok', 'short_video', 2018, undefined, ALL, 100, 0.1, '15 segundos decidem um hit; trechos acelerados.', '15 seconds decide a hit; sped-up snippets.', 'short_video'),
  pf('snapreel', 'SnapReel', 'Instagram Reels / YouTube Shorts', 'short_video', 2020, undefined, ALL, 85, 0.1, 'Clone de vídeo curto das grandes redes.', 'Big-network short-video clone.', 'short_video'),
  pf('voxera', 'Voxera', undefined, 'voice_market', 2031, undefined, ALL, 80, 0.4, 'Mercado de vozes licenciadas: qualquer letra, qualquer timbre.', 'Licensed voice marketplace: any lyric, any timbre.', 'synthetic_voice'),
  pf('timbre_bank', 'TimbreBank', undefined, 'voice_market', 2033, undefined, ['asia', 'na', 'eu'], 50, 0.3, 'Banco de timbres de vozes falecidas, com herdeiros como sócios.', 'Bank of late singers\' timbres, with heirs as partners.', 'synthetic_voice'),
  pf('cortexfeed', 'CortexFeed', undefined, 'neural_feed', 2036, undefined, ALL, 90, 0.35, 'Música gerada sob medida para o humor medido em tempo real.', 'Music generated to fit mood measured in real time.', 'neural'),
  pf('dreamline', 'Dreamline', undefined, 'neural_feed', 2038, undefined, ['asia', 'na', 'eu'], 60, 0.25, 'Trilha para o sono e sonhos guiados.', 'Soundtracks for sleep and guided dreams.', 'neural'),
];

// =====================================================================================
// VEÍCULOS de crítica (com viés) e CRÍTICOS
// =====================================================================================
export type OutletKind = 'magazine' | 'newspaper' | 'tv_show' | 'radio_show' | 'podcast' | 'web' | 'newsletter' | 'neural_feed';

export interface OutletBias {
  favored: FamilyId[];
  disfavored: FamilyId[];
  /** −1 = só underground … +1 = só mainstream */
  mainstream: number;
  /** 0 = generoso … 1 = implacável */
  harshness: number;
  /** 0..100 */
  prestige: number;
}

export interface OutletDef {
  id: string;
  name: string;
  realRef?: string;
  kind: OutletKind;
  market: MarketId | 'global';
  start: number;
  end?: number;
  bias: OutletBias;
  desc: L;
  /** nome correspondente em MEDIA (catalog.ts), quando existir */
  mediaName?: string;
}

const ob = (favored: FamilyId[], disfavored: FamilyId[], mainstream: number, harshness: number, prestige: number): OutletBias => ({ favored, disfavored, mainstream, harshness, prestige });
const ou = (id: string, name: string, realRef: string | undefined, kind: OutletKind, market: OutletDef['market'], start: number, end: number | undefined, bias: OutletBias, pt: string, en: string, mediaName?: string): OutletDef =>
  ({ id, name, realRef, kind, market, start, end, bias, desc: l(pt, en), mediaName });

export const OUTLETS: OutletDef[] = [
  ou('palco_partitura', 'Palco & Partitura', 'Variety', 'newspaper', 'na', 1920, undefined, ob(['pop', 'blues_jazz', 'sacred'], ['hiphop'], 0.7, 0.4, 60), 'Bíblia do show business: bilheteria antes de arte.', 'Show-business bible: box office before art.', 'Palco & Partitura'),
  ou('agulha_classica', 'Agulha Clássica', 'Gramophone', 'magazine', 'eu', 1923, undefined, ob(['sacred', 'blues_jazz'], ['pop', 'hiphop', 'electronic'], -0.2, 0.6, 82), 'Ouvidos de conservatório; pop é ruído.', 'Conservatory ears; pop is noise.', 'Agulha Clássica'),
  ou('tune_maker', 'Tune Maker', 'Melody Maker', 'magazine', 'eu', 1926, 2000, ob(['blues_jazz', 'rock'], ['pop'], -0.1, 0.5, 70), 'Do jazz ao rock, sempre de olho no músico.', 'From jazz to rock, always about the musician.', 'Tune Maker'),
  ou('worldsound_weekly', 'WorldSound Weekly', 'Billboard', 'magazine', 'global', 1920, undefined, ob(['pop', 'rnb', 'country_folk'], [], 0.9, 0.2, 55), 'Revista do setor: números, paradas e negócios.', 'Trade magazine: numbers, charts and deals.', 'WorldSound Weekly'),
  ou('ondas_astros', 'Ondas & Astros', 'Revista do Rádio', 'magazine', 'br', 1948, 1970, ob(['brazil', 'latin'], ['rock'], 0.8, 0.15, 35), 'Fofoca de auditório e cupons de votação.', 'Radio-show gossip and voting coupons.', 'Ondas & Astros'),
  ou('weekly_needle', 'Weekly Needle', 'NME', 'newspaper', 'eu', 1952, undefined, ob(['rock', 'electronic', 'hiphop'], ['country_folk', 'sacred'], -0.4, 0.75, 76), 'Semanal britânico que cria e destrói hypes em 3 edições.', 'UK weekly that builds and kills hypes in 3 issues.', 'Weekly Needle'),
  ou('rock_chronicle', 'Rock Chronicle', 'Rolling Stone', 'magazine', 'na', 1967, undefined, ob(['rock', 'country_folk', 'rnb'], ['electronic'], 0.2, 0.5, 82), 'Capa é coroação; resenha de 5 estrelas é raríssima.', 'A cover is a coronation; 5-star reviews are rare.', 'Rock Chronicle'),
  ou('groove_bulletin', 'Groove Bulletin', 'Jet / Ebony (música)', 'magazine', 'na', 1951, undefined, ob(['rnb', 'blues_jazz', 'hiphop'], ['rock'], 0.4, 0.35, 66), 'Imprensa de cultura negra; soul e gospel no centro.', 'Black culture press; soul and gospel at the center.'),
  ou('jazz_downbeat', 'Contratempo', 'DownBeat', 'magazine', 'na', 1934, undefined, ob(['blues_jazz'], ['pop', 'hiphop'], -0.3, 0.55, 80), 'Votação de críticos e estrelas para solistas.', 'Critics\' polls and star ratings for soloists.'),
  ou('whirl', 'Whirl', 'Spin', 'magazine', 'na', 1985, undefined, ob(['rock', 'hiphop', 'pop'], ['country_folk'], -0.1, 0.5, 70), 'Pop e alternativo com atitude.', 'Pop and alternative with attitude.', 'Whirl'),
  ou('barulho', 'Barulho', 'Bizz', 'magazine', 'br', 1985, 2007, ob(['rock', 'brazil'], ['country_folk'], -0.2, 0.55, 70), 'A revista do rock brasileiro e do pós-punk paulistano.', 'The magazine of Brazilian rock and São Paulo post-punk.', 'Barulho'),
  ou('vault', 'Vault Magazine', 'Mojo', 'magazine', 'eu', 1993, undefined, ob(['rock', 'rnb', 'blues_jazz'], ['electronic', 'hiphop'], 0, 0.35, 80), 'Reedições, caixas e veteranos.', 'Reissues, box sets and veterans.', 'Vault Magazine'),
  ou('spearpoint', 'Spearpoint Review', 'Pitchfork', 'web', 'global', 1996, undefined, ob(['rock', 'electronic', 'hiphop'], ['country_folk', 'pop'], -0.7, 0.8, 90), 'Notas com uma casa decimal que fazem ou afundam discos indie.', 'One-decimal scores that make or sink indie records.', 'Spearpoint Review'),
  ou('mixmeter', 'MixMeter', 'Mixmag', 'magazine', 'eu', 1983, undefined, ob(['electronic'], ['country_folk', 'rock'], 0, 0.4, 66), 'Clubes, DJs e a faixa do verão.', 'Clubs, DJs and the track of the summer.'),
  ou('source_code', 'The Cipher', 'The Source', 'magazine', 'na', 1988, undefined, ob(['hiphop', 'rnb'], ['rock', 'country_folk'], 0.2, 0.6, 72), 'Microfones de nota para discos de rap; rixas na capa.', 'Mic ratings for rap records; feuds on the cover.'),
  ou('vibe_es', 'Ritmo Total', 'Billboard Latin / Rolling Stone en Español', 'magazine', 'latam', 1994, undefined, ob(['latin', 'caribbean'], [], 0.6, 0.35, 62), 'Música latina do bolero ao trap.', 'Latin music from bolero to trap.'),
  ou('asia_beat', 'Lumen Pop', 'Rolling Stone Japan / IZM', 'web', 'asia', 1998, undefined, ob(['asia_me', 'pop'], [], 0.3, 0.45, 60), 'Crítica pan-asiática de pop e indie.', 'Pan-Asian pop and indie criticism.'),
  ou('afropulse', 'AfroPulse', 'OkayAfrica / Native Mag', 'web', 'africa', 2011, undefined, ob(['africa', 'hiphop', 'caribbean'], [], 0.1, 0.4, 62), 'A voz da nova cena africana e da diáspora.', 'The voice of the new African scene and diaspora.'),
  ou('jornal_caderno', 'Caderno Dois', 'Ilustrada (Folha) / Segundo Caderno', 'newspaper', 'br', 1958, undefined, ob(['brazil', 'blues_jazz'], ['country_folk'], -0.1, 0.55, 74), 'Caderno cultural de jornal diário; uma crítica dura vira assunto na cidade.', 'Daily paper arts section; one harsh review is the talk of the town.'),
  ou('gala_tv', 'Gala de Domingo', 'The Ed Sullivan Show', 'tv_show', 'na', 1948, 1971, ob(['pop', 'rock', 'sacred'], [], 0.95, 0.1, 40), 'Uma noite no programa = um país inteiro te conhece.', 'One night on the show = a whole country knows you.', 'Gala de Domingo'),
  ou('chacrinha_like', 'Buzina do Domingo', 'Cassino do Chacrinha', 'tv_show', 'br', 1956, 1988, ob(['brazil', 'pop'], ['blues_jazz'], 0.95, 0.2, 35), 'Calouros, buzina e bacalhau jogado na plateia.', 'Amateurs, a horn and codfish thrown at the crowd.'),
  ou('parada_quente', 'Parada Quente', 'Top of the Pops', 'tv_show', 'eu', 1964, 2006, ob(['pop', 'rock'], ['blues_jazz'], 1, 0.1, 40), 'Dublagem em estúdio para o país na quinta à noite.', 'Studio lip-sync for the nation on Thursday night.', 'Parada Quente'),
  ou('late_peel', 'Sessões da Meia-Noite', 'Peel Sessions (BBC Radio 1)', 'radio_show', 'eu', 1967, 2004, ob(['rock', 'electronic', 'caribbean', 'africa'], ['pop'], -0.9, 0.3, 88), 'Sessões gravadas para o DJ mais curioso do rádio.', 'Recorded sessions for radio\'s most curious DJ.'),
  ou('countdown_radio', 'Contagem Regressiva', 'American Top 40', 'radio_show', 'na', 1970, undefined, ob(['pop', 'rnb', 'country_folk'], [], 1, 0.05, 30), 'As 40 mais da semana, com dedicatórias.', 'The week\'s top 40, with dedications.'),
  ou('jazz_radio_br', 'Noite do Choro', 'Programa de choro e samba da Rádio Nacional', 'radio_show', 'br', 1940, 1975, ob(['brazil', 'blues_jazz'], ['rock'], 0, 0.3, 60), 'Regionais ao vivo, partituras na mão.', 'Live ensembles, sheet music in hand.'),
  ou('critique_podcast', 'Faixa a Faixa', 'Song Exploder / Switched on Pop', 'podcast', 'global', 2014, undefined, ob(['pop', 'rnb', 'hiphop'], [], 0.3, 0.3, 64), 'Autópsia de hits com produtores convidados.', 'Hit autopsies with guest producers.'),
  ou('stan_feed', 'StanHub', 'contas de fã-clube / Genius', 'web', 'global', 2012, undefined, ob(['pop', 'hiphop'], ['sacred'], 0.8, 0.1, 25), 'Fan-accounts que viram imprensa.', 'Fan accounts that become press.'),
  ou('long_read', 'Ouvido Absoluto', 'The Quietus / The Wire', 'web', 'eu', 2008, undefined, ob(['electronic', 'rock', 'blues_jazz'], ['pop'], -0.9, 0.6, 84), 'Ensaios longos sobre o experimental.', 'Long essays on the experimental.'),
  ou('feedback_diario', 'Feedback Diário', undefined, 'web', 'global', 2031, undefined, ob(['rock', 'country_folk', 'blues_jazz'], ['electronic'], -0.3, 0.6, 70), 'Crítica da era sintética: perguntas sobre autoria em cada resenha.', 'Synthetic-era criticism: authorship questions in every review.', 'Feedback Diário'),
  ou('cortex_review', 'Cortex Review', undefined, 'neural_feed', 'global', 2036, undefined, ob(['electronic', 'pop'], ['country_folk'], 0.6, 0.2, 50), 'Resenha gerada por leitura de ondas cerebrais de mil ouvintes.', 'Review generated from brainwave readings of a thousand listeners.'),
  ou('human_letter', 'Carta Humana', undefined, 'newsletter', 'global', 2032, undefined, ob(['rock', 'country_folk', 'blues_jazz', 'brazil'], ['electronic', 'pop'], -0.6, 0.45, 72), 'Newsletter do movimento "Feito por Humanos".', 'Newsletter of the "Made by Humans" movement.'),
];

export interface CriticDef {
  id: string;
  name: string;
  outlet: string;
  start: number;
  end: number;
  favored: FamilyId[];
  disfavored: FamilyId[];
  mainstream: number;
  harshness: number;
  /** mania pessoal, usada em textos de evento */
  quirk: L;
}

const cr = (id: string, name: string, outlet: string, start: number, end: number, favored: FamilyId[], disfavored: FamilyId[], mainstream: number, harshness: number, pt: string, en: string): CriticDef =>
  ({ id, name, outlet, start, end, favored, disfavored, mainstream, harshness, quirk: l(pt, en) });

export const CRITICS: CriticDef[] = [
  cr('c_amberly', 'Hollis Amberly', 'palco_partitura', 1920, 1952, ['pop', 'blues_jazz'], ['country_folk'], 0.7, 0.4, 'Mede canções pelo número de partituras vendidas.', 'Measures songs by sheet music sold.'),
  cr('c_vautrin', 'Odile Vautrin', 'agulha_classica', 1925, 1970, ['sacred'], ['pop', 'rock'], -0.3, 0.8, 'Considera qualquer microfone uma traição.', 'Considers any microphone a betrayal.'),
  cr('c_brennan', 'Clyde Brennan', 'tune_maker', 1930, 1968, ['blues_jazz'], ['pop'], -0.2, 0.55, 'Só respeita quem lê partitura.', 'Only respects those who read music.'),
  cr('c_lacerda', 'Dalva Lacerda', 'ondas_astros', 1948, 1970, ['brazil', 'latin'], ['rock'], 0.8, 0.15, 'Elege a "voz do ano" por cartas de fãs.', 'Picks the "voice of the year" from fan letters.'),
  cr('c_hatch', 'Miles Hatch', 'jazz_downbeat', 1945, 1990, ['blues_jazz'], ['rock', 'pop'], -0.5, 0.7, 'Dá uma estrela a qualquer disco com guitarra elétrica.', 'Gives one star to anything with electric guitar.'),
  cr('c_marsh', 'Irene Marsh', 'groove_bulletin', 1955, 1995, ['rnb', 'sacred'], [], 0.3, 0.35, 'Defende o gospel como raiz de tudo.', 'Champions gospel as the root of everything.'),
  cr('c_teller', 'Wes Teller', 'weekly_needle', 1962, 1985, ['rock'], ['country_folk', 'pop'], -0.5, 0.85, 'Escreve resenhas mais famosas que os discos.', 'Writes reviews more famous than the records.'),
  cr('c_ridley', 'Lorna Ridley', 'rock_chronicle', 1967, 2005, ['rock', 'country_folk'], ['electronic'], 0.1, 0.55, 'Odeia sintetizadores; ama letras confessionais.', 'Hates synths; loves confessional lyrics.'),
  cr('c_quintela', 'Paulinho Quintela', 'jornal_caderno', 1960, 2000, ['brazil', 'blues_jazz'], ['country_folk'], -0.2, 0.6, 'Compara tudo com a bossa nova — e quase tudo perde.', 'Compares everything to bossa nova — and almost everything loses.'),
  cr('c_moura', 'Glória Moura', 'chacrinha_like', 1965, 1988, ['brazil', 'pop'], [], 0.95, 0.2, 'Jurada de calouros; nota 10 para quem rebola.', 'Talent-show judge; a 10 for whoever dances.'),
  cr('c_stroud', 'Dean Stroud', 'late_peel', 1967, 2004, ['rock', 'caribbean', 'africa', 'electronic'], ['pop'], -0.9, 0.3, 'Toca a mesma demo duas vezes se gostar.', 'Plays the same demo twice if he likes it.'),
  cr('c_fairley', 'Carla Fairley', 'countdown_radio', 1970, 2010, ['pop', 'country_folk'], [], 1, 0.05, 'Nunca falou mal de ninguém no ar.', 'Never spoke ill of anyone on air.'),
  cr('c_bramble', 'Tess Bramble', 'weekly_needle', 1985, 2015, ['rock', 'electronic'], ['pop'], -0.4, 0.8, 'Proclama a "melhor banda do mundo" duas vezes por ano.', 'Proclaims the "best band in the world" twice a year.'),
  cr('c_aragao', 'Renato Aragão Teles', 'barulho', 1985, 2007, ['rock', 'brazil'], ['country_folk'], -0.3, 0.65, 'Cobra atitude punk até de sambista.', 'Demands punk attitude even from samba players.'),
  cr('c_okafor', 'Femi Okafor', 'mixmeter', 1988, 2025, ['electronic', 'africa'], ['rock'], 0, 0.4, 'Avalia faixas pela reação da pista às 4 da manhã.', 'Rates tracks by the 4 a.m. dancefloor reaction.'),
  cr('c_vance', 'Nate Vance', 'source_code', 1990, 2020, ['hiphop'], ['rock'], 0.2, 0.65, 'Desconta pontos por refrão cantado.', 'Docks points for sung hooks.'),
  cr('c_whitlock', 'Ivy Whitlock', 'whirl', 1988, 2015, ['rock', 'pop', 'hiphop'], ['country_folk'], -0.1, 0.5, 'Ama a segunda faixa de todo disco.', 'Loves every album\'s second track.'),
  cr('c_keene', 'Silas Keene', 'vault', 1993, 2030, ['rock', 'rnb'], ['electronic', 'hiphop'], 0, 0.3, 'Toda reedição "supera o original".', 'Every reissue "surpasses the original".'),
  cr('c_pryor', 'Opal Pryor', 'spearpoint', 1998, 2025, ['electronic', 'rock', 'hiphop'], ['pop', 'country_folk'], -0.8, 0.85, 'Dá 9.6 a um disco de ruído e 2.1 ao hit do verão.', 'Gives a 9.6 to a noise record and 2.1 to the summer hit.'),
  cr('c_salcedo', 'Ximena Salcedo', 'vibe_es', 1996, 2035, ['latin', 'caribbean'], [], 0.5, 0.4, 'Odeia remix de reggaeton "para gringo".', 'Hates reggaeton remixes "for gringos".'),
  cr('c_hosono', 'Akiko Mori', 'asia_beat', 2000, 2035, ['asia_me', 'pop'], [], 0.3, 0.5, 'Avalia coreografia como parte da música.', 'Rates choreography as part of the music.'),
  cr('c_adebayo', 'Tiwa Adebayo', 'afropulse', 2011, 2040, ['africa', 'hiphop'], [], 0.1, 0.45, 'Cobra crédito para produtores africanos.', 'Demands credit for African producers.'),
  cr('c_mercer', 'June Mercer', 'critique_podcast', 2014, 2040, ['pop', 'rnb'], [], 0.4, 0.3, 'Explica cada hit pela ponte.', 'Explains every hit through the bridge.'),
  cr('c_ashby', 'Toby Ashby', 'stan_feed', 2013, 2040, ['pop'], ['sacred'], 0.9, 0.1, 'Ex-fã-clube; sabe a data de cada teaser.', 'Ex-fan-club admin; knows every teaser date.'),
  cr('c_lindner', 'Lena Lindner', 'long_read', 2008, 2040, ['electronic', 'blues_jazz'], ['pop'], -0.9, 0.6, 'Resenhas de 6.000 palavras sobre um EP de 12 minutos.', '6,000-word reviews of a 12-minute EP.'),
  cr('c_sutter', 'Grady Sutter', 'worldsound_weekly', 1975, 2030, ['pop', 'country_folk'], [], 0.9, 0.2, 'Prevê o número 1 com três semanas de antecedência.', 'Predicts the number 1 three weeks ahead.'),
  cr('c_nassar', 'Leila Nassar', 'feedback_diario', 2031, 2040, ['rock', 'blues_jazz'], ['electronic'], -0.3, 0.65, 'Pergunta em toda resenha: "quem cantou isso, de verdade?"', 'Asks in every review: "who really sang this?"'),
  cr('c_kiri', 'Kiri-7', 'cortex_review', 2036, 2040, ['electronic', 'pop'], ['country_folk'], 0.6, 0.2, 'Crítico sintético; mede picos de dopamina.', 'Synthetic critic; measures dopamine spikes.'),
  cr('c_valente', 'Celeste Valente', 'human_letter', 2032, 2040, ['brazil', 'rock', 'country_folk'], ['electronic'], -0.6, 0.45, 'Elogia erros de afinação como "prova de vida".', 'Praises pitch slips as "proof of life".'),
  cr('c_rourke', 'Harriet Rourke', 'gala_tv', 1950, 1971, ['pop', 'sacred'], ['rock'], 0.95, 0.15, 'Produtora do programa: corta quem rebola demais.', 'Show producer: cuts whoever wiggles too much.'),
  cr('c_ocampo', 'Andrés Ocampo', 'vibe_es', 2005, 2040, ['latin', 'hiphop'], ['country_folk'], 0.4, 0.55, 'Defende o trap latino contra os puristas.', 'Defends Latin trap against the purists.'),
  cr('c_ishikawa', 'Ryo Ishikawa', 'parada_quente', 1975, 2006, ['pop', 'rock'], [], 1, 0.1, 'Apresentador que trata cada número 1 como final de Copa.', 'Host who treats every number 1 like a Cup final.'),
];

// =====================================================================================
// PRODUTORES fictícios (por era)
// =====================================================================================
export type ProducerSignature =
  | 'wall_of_sound' | 'lo_fi' | 'maximalist' | 'dry' | 'organic' | 'trap_808' | 'neural' | 'live_room' | 'orchestral'
  | 'tape_echo' | 'gated_reverb' | 'loudness' | 'sample_collage' | 'dub_space' | 'autotune' | 'minimal' | 'arranger';

export interface ProducerDef {
  id: string;
  name: string;
  signature: ProducerSignature;
  start: number;
  end: number;
  city: string;
  families: FamilyId[];
  /** 40..95 */
  skill: number;
  /** cachê base por álbum, em dólares reais */
  fee: number;
  /** 0..100: quanto impõe a própria marca sobre o artista */
  ego: number;
  trait: L;
}

const pr = (id: string, name: string, signature: ProducerSignature, start: number, end: number, city: string, families: FamilyId[], skill: number, fee: number, ego: number, pt: string, en: string): ProducerDef =>
  ({ id, name, signature, start, end, city, families, skill, fee, ego, trait: l(pt, en) });

export const PRODUCERS: ProducerDef[] = [
  pr('p_hollister', 'Abe Hollister', 'arranger', 1920, 1950, 'new_york', ['blues_jazz', 'pop'], 72, 1500, 40, 'Arranjador de orquestra; corta solos longos.', 'Orchestra arranger; trims long solos.'),
  pr('p_benedito', 'Benedito Rangel', 'live_room', 1925, 1960, 'rio', ['brazil'], 70, 900, 30, 'Grava regional inteiro num microfone só.', 'Records a whole ensemble on a single mic.'),
  pr('p_delorme', 'Lucien Delorme', 'organic', 1928, 1965, 'paris', ['europe', 'blues_jazz'], 68, 1100, 45, 'Busca o "ar" da sala nos discos de chanson.', 'Chases the room\'s "air" on chanson records.'),
  pr('p_crane', 'Mabel Crane', 'live_room', 1930, 1962, 'nashville', ['country_folk', 'sacred'], 74, 1200, 25, 'Pioneira do som de celeiro.', 'Pioneer of the barn sound.'),
  pr('p_iriarte', 'Ramón Iriarte', 'orchestral', 1935, 1970, 'havana', ['latin', 'caribbean'], 76, 1300, 50, 'Metais em brasa e cordas de bolero.', 'Blazing brass and bolero strings.'),
  pr('p_takeuchi', 'Kenji Takeuchi', 'orchestral', 1938, 1975, 'tokyo', ['asia_me', 'pop'], 70, 1000, 35, 'Arranjos de kayōkyoku com cordas ocidentais.', 'Kayōkyoku arrangements with Western strings.'),
  pr('p_barlow', 'Floyd Barlow', 'tape_echo', 1948, 1972, 'memphis', ['rock', 'rnb', 'country_folk'], 80, 2000, 55, 'Eco de fita e slapback em tudo.', 'Tape echo and slapback on everything.'),
  pr('p_whitmore', 'Reggie Whitmore', 'dry', 1950, 1980, 'chicago', ['blues_jazz', 'rnb'], 78, 1800, 30, 'Grava blues seco, sem enfeite.', 'Records blues bone-dry, no frills.'),
  pr('p_lazar', 'Vera Lazar', 'wall_of_sound', 1958, 1975, 'los_angeles', ['pop', 'rnb'], 88, 9000, 90, 'Parede de som: seis guitarras e quatro pianos em uníssono.', 'Wall of sound: six guitars and four pianos in unison.'),
  pr('p_gale', 'Otis Gale', 'live_room', 1959, 1985, 'detroit', ['rnb'], 85, 6000, 60, 'Linha de montagem de hits com banda da casa.', 'Hit assembly line with a house band.'),
  pr('p_sutton', 'Nora Sutton', 'tape_echo', 1962, 1980, 'london', ['rock', 'pop'], 84, 7000, 45, 'Fitas ao contrário e experimentos de estúdio.', 'Backwards tapes and studio experiments.'),
  pr('p_marcondes', 'Rogério Marcondes', 'orchestral', 1962, 1990, 'rio', ['brazil'], 86, 5000, 50, 'Arranjos tropicalistas com orquestra e distorção.', 'Tropicália arrangements with orchestra and fuzz.'),
  pr('p_viana', 'Celeste Viana', 'organic', 1965, 1995, 'sao_paulo', ['brazil', 'rock'], 74, 3000, 35, 'Capta a banda tocando junta, erros incluídos.', 'Captures the band playing together, mistakes included.'),
  pr('p_ekstrom', 'Lasse Ekström', 'maximalist', 1972, 2000, 'stockholm', ['pop', 'europe'], 86, 8000, 55, 'Refrões em camadas de 48 vozes.', '48-voice layered choruses.'),
  pr('p_kingsley', 'Calvin Kingsley', 'dub_space', 1970, 2000, 'kingston', ['caribbean'], 82, 2500, 50, 'Tira instrumentos da mixagem e deixa o eco falar.', 'Drops instruments from the mix and lets the echo talk.'),
  pr('p_brandt', 'Florian Brandt', 'minimal', 1970, 2005, 'berlin', ['electronic', 'rock'], 80, 4000, 65, 'Motorik, sequenciadores e silêncio.', 'Motorik, sequencers and silence.'),
  pr('p_moreau', 'Raoul Moreau', 'maximalist', 1975, 1990, 'munich', ['rnb', 'electronic', 'europe'], 84, 9000, 60, 'Disco orquestral com sintetizador na linha de baixo.', 'Orchestral disco with synth bass lines.'),
  pr('p_hart', 'Ute Hartmann', 'gated_reverb', 1979, 1995, 'london', ['rock', 'pop'], 82, 12000, 55, 'Bateria com reverb cortado: o som dos anos 80.', 'Gated-reverb drums: the sound of the 80s.'),
  pr('p_nash', 'Marty Nash', 'loudness', 1982, 2010, 'los_angeles', ['rock'], 79, 15000, 70, 'Guitarras empilhadas e volume máximo.', 'Stacked guitars and maximum loudness.'),
  pr('p_okon', 'Dayo Okonkwo', 'live_room', 1970, 2000, 'lagos', ['africa', 'rnb'], 80, 2500, 50, 'Bandas de 15 músicos ao vivo num take.', '15-piece bands live in one take.'),
  pr('p_bassline', 'Eddie "Breaks" Holloway', 'sample_collage', 1986, 2010, 'new_york', ['hiphop'], 87, 10000, 65, 'Colagem de 40 samples por faixa; liberações são problema seu.', '40 samples per track; clearances are your problem.'),
  pr('p_iyer', 'Kavya Iyer', 'orchestral', 1980, 2020, 'mumbai', ['asia_me', 'pop'], 85, 8000, 45, 'Trilha de cinema com tabla e sintetizador.', 'Film scores with tabla and synths.'),
  pr('p_sakai', 'Hana Sakai', 'organic', 1978, 2005, 'tokyo', ['asia_me', 'pop'], 83, 6000, 30, 'City pop polido com músicos de estúdio.', 'Polished city pop with session players.'),
  pr('p_falcao', 'Diogo Falcão', 'lo_fi', 1988, 2015, 'recife', ['brazil', 'hiphop', 'rock'], 76, 2500, 40, 'Mangue no gravador de quatro pistas.', 'Mangue on a four-track recorder.'),
  pr('p_lowell', 'Ruth Lowell', 'lo_fi', 1985, 2015, 'seattle', ['rock'], 77, 4000, 35, 'Grava bandas em 10 dias e se recusa a polir.', 'Records bands in 10 days and refuses to polish.'),
  pr('p_dupre', 'Théo Dupré', 'minimal', 1993, 2020, 'paris', ['electronic'], 81, 7000, 60, 'Filtros e compressão bombeando.', 'Filters and pumping compression.'),
  pr('p_newjack', 'Dolores "Dee" Keene', 'maximalist', 1990, 2015, 'new_york', ['rnb', 'pop'], 86, 25000, 70, 'New jack e R&B com batidas pesadas.', 'New jack and R&B with heavy beats.'),
  pr('p_dembow', 'Hugo Salcedo', 'autotune', 1998, 2030, 'san_juan', ['caribbean', 'latin'], 82, 15000, 60, 'Reggaeton com dembow e voz afinada no talo.', 'Reggaeton with dembow and maxed-out tuning.'),
  pr('p_lindqvist', 'Nils Lindqvist', 'maximalist', 1996, 2030, 'stockholm', ['pop'], 93, 60000, 75, 'Fórmula matemática do refrão; escreveu 20 números 1.', 'Mathematical chorus formula; wrote 20 number ones.'),
  pr('p_808', 'Tunde "808" Balogun', 'trap_808', 2005, 2035, 'atlanta', ['hiphop'], 88, 30000, 65, 'Hi-hats em tercinas e 808 que fazem o carro tremer.', 'Triplet hi-hats and 808s that rattle the car.'),
  pr('p_park', 'Seo-yeon Park', 'maximalist', 2005, 2035, 'seoul', ['pop', 'asia_me'], 90, 40000, 60, 'Músicas com 4 seções diferentes e mudança de tom.', 'Songs with 4 sections and a key change.'),
  pr('p_wiz', 'Kofi Asante', 'organic', 2010, 2040, 'accra', ['africa', 'hiphop'], 84, 18000, 45, 'Percussão viva sob batidas de afrobeats.', 'Live percussion under afrobeats grooves.'),
  pr('p_bedroom', 'Lumi Sandberg', 'lo_fi', 2012, 2040, 'los_angeles', ['pop', 'electronic'], 78, 5000, 25, 'Produz álbuns inteiros num notebook, de pijama.', 'Makes whole albums on a laptop in pajamas.'),
  pr('p_dj_mascote', 'Thiago Batista', 'trap_808', 2010, 2040, 'sao_paulo', ['brazil', 'hiphop'], 80, 9000, 55, 'Funk e trap com graves estourados.', 'Funk and trap with blown-out bass.'),
  pr('p_amapiano', 'Lerato Nkosi', 'minimal', 2014, 2040, 'johannesburg', ['africa', 'electronic'], 84, 12000, 40, 'Log drum e pianos espaçados.', 'Log drums and spacious pianos.'),
  pr('p_hyper', 'Sadie Quill', 'maximalist', 2015, 2040, 'london', ['pop', 'electronic'], 83, 14000, 70, 'Vozes aceleradas e distorção cintilante.', 'Sped-up vocals and glittering distortion.'),
  pr('p_corridos', 'Mateo Arriaga', 'organic', 2016, 2040, 'guadalajara', ['latin'], 79, 10000, 45, 'Requinto e tuba gravados ao vivo com trap por baixo.', 'Requinto and tuba live over trap.'),
  pr('p_neural_a', 'Iro Vela', 'neural', 2030, 2040, 'tokyo', ['electronic', 'pop'], 90, 80000, 50, 'Treina modelos dedicados para cada artista.', 'Trains dedicated models for each artist.'),
  pr('p_neural_b', 'Nyx Halden', 'neural', 2032, 2040, 'los_angeles', ['pop', 'hiphop'], 86, 60000, 70, 'Gera mil versões e escolhe pela leitura neural da plateia teste.', 'Generates a thousand versions and picks by test-audience neural reads.'),
  pr('p_handmade', 'Aurora Peixoto', 'organic', 2028, 2040, 'lisbon', ['rock', 'europe', 'country_folk'], 85, 20000, 40, 'Fita analógica e zero edição digital: certificação "feito por humanos".', 'Analog tape and zero digital edits: "made by humans" certified.'),
  pr('p_dub_future', 'Juma Mwangi', 'dub_space', 2030, 2040, 'nairobi', ['africa', 'electronic'], 80, 15000, 45, 'Dub háptico: graves que se sentem na pele.', 'Haptic dub: bass you feel on your skin.'),
  pr('p_choir', 'Saga Holm', 'neural', 2031, 2040, 'oslo', ['sacred', 'electronic'], 82, 30000, 35, 'Corais sintéticos de mil vozes licenciadas.', 'Synthetic choirs of a thousand licensed voices.'),
  pr('p_salsa', 'Pilar Montaner', 'live_room', 1965, 1995, 'new_york', ['latin', 'caribbean'], 83, 4000, 40, 'Salsa dura: orquestra de 14, sem metrônomo.', 'Hard salsa: 14-piece band, no click.'),
  pr('p_highlife', 'Kwame Mensah', 'arranger', 1950, 1980, 'accra', ['africa'], 75, 1500, 35, 'Highlife de big band com guitarras palm-wine.', 'Big-band highlife with palm-wine guitars.'),
  pr('p_bolly', 'Anaya Desai', 'arranger', 1950, 1990, 'mumbai', ['asia_me'], 82, 3000, 40, 'Orquestras de cem músicos para playback de cinema.', 'Hundred-piece orchestras for film playback.'),
];

// =====================================================================================
// MARCAS, PATROCINADORES e CLIENTES DE SYNC
// =====================================================================================
export type BrandCategory =
  | 'soft_drink' | 'sneakers' | 'car' | 'tech' | 'phone' | 'film_studio' | 'tv_network' | 'novela' | 'game_studio'
  | 'ad_agency' | 'fashion' | 'cosmetics' | 'airline' | 'bank' | 'food' | 'radio_maker' | 'streaming_original';
export type BrandValue = 'family' | 'edgy' | 'luxury' | 'youth' | 'tradition' | 'tech' | 'eco' | 'sport' | 'national' | 'mass';
export type SyncKind = 'film' | 'ad' | 'tv' | 'novela' | 'game' | 'trailer' | 'jingle';

export interface BrandDef {
  id: string;
  name: string;
  realRef?: string;
  category: BrandCategory;
  start: number;
  end?: number;
  markets: MarketId[];
  /** 1 (local) .. 5 (global, verba enorme) */
  budget: 1 | 2 | 3 | 4 | 5;
  values: BrandValue[];
  /** usos de sync típicos */
  sync: SyncKind[];
  desc: L;
}

const br_ = (id: string, name: string, realRef: string | undefined, category: BrandCategory, start: number, end: number | undefined, markets: MarketId[], budget: BrandDef['budget'], values: BrandValue[], sync: SyncKind[], pt: string, en: string): BrandDef =>
  ({ id, name, realRef, category, start, end, markets, budget, values, sync, desc: l(pt, en) });

export const BRANDS: BrandDef[] = [
  br_('b_fizz', 'Fizz-Ola', 'Coca-Cola', 'soft_drink', 1920, undefined, ALL, 5, ['family', 'mass'], ['ad', 'jingle'], 'Refrigerante global; jingles que viram hino.', 'Global soda; jingles that become anthems.'),
  br_('b_pepper', 'Pep Royale', 'Pepsi', 'soft_drink', 1935, undefined, ALL, 5, ['youth', 'mass'], ['ad', 'jingle'], 'A "escolha da nova geração"; paga estrelas pop.', 'The "choice of a new generation"; pays pop stars.'),
  br_('b_guarana', 'Guaraná Aurora', 'Guaraná Antarctica', 'soft_drink', 1925, undefined, ['br'], 3, ['national', 'family'], ['ad', 'jingle'], 'Refrigerante brasileiro de comerciais de verão.', 'Brazilian soda of summer ads.'),
  br_('b_stride', 'Stride', 'Nike', 'sneakers', 1972, undefined, ALL, 5, ['sport', 'youth', 'edgy'], ['ad', 'trailer'], 'Tênis e atitude; campanhas com rap e rock.', 'Sneakers and attitude; campaigns with rap and rock.'),
  br_('b_three', 'Tres Lineas', 'Adidas', 'sneakers', 1949, undefined, ALL, 4, ['sport', 'youth'], ['ad'], 'Três listras e parcerias com grupos de rap.', 'Three stripes and rap group partnerships.'),
  br_('b_volksauto', 'Volksmobil', 'Volkswagen', 'car', 1938, undefined, ALL, 4, ['family', 'mass'], ['ad'], 'Carro do povo; comercial com música folk.', 'People\'s car; ads with folk songs.'),
  br_('b_motorco', 'Meridian Motors', 'General Motors / Ford', 'car', 1920, undefined, ['na', 'latam', 'br'], 5, ['tradition', 'mass'], ['ad', 'tv'], 'Patrocina programas de rádio inteiros.', 'Sponsors entire radio shows.'),
  br_('b_luxcar', 'Valcourt', 'Mercedes-Benz / Cadillac', 'car', 1925, undefined, ['na', 'eu', 'asia'], 4, ['luxury'], ['ad'], 'Luxo; prefere jazz e clássica.', 'Luxury; prefers jazz and classical.'),
  br_('b_radiola', 'Radiola Fênix', 'RCA / Philco', 'radio_maker', 1922, 1985, ['na', 'br', 'latam'], 4, ['tech', 'family'], ['ad', 'tv'], 'Fabricante de rádios e vitrolas.', 'Radio and phonograph maker.'),
  br_('b_walkman', 'Pocketone', 'Sony (Walkman)', 'tech', 1979, undefined, ALL, 5, ['tech', 'youth'], ['ad'], 'Toca-fitas portátil; depois tudo que é tela.', 'Portable tape player; later every kind of screen.'),
  br_('b_fruitco', 'Orchard Computers', 'Apple', 'tech', 1984, undefined, ALL, 5, ['tech', 'youth', 'luxury'], ['ad'], 'Um comercial com sua música = top 10 garantido.', 'An ad with your song = guaranteed top 10.'),
  br_('b_flip', 'Nokter Mobile', 'Nokia / Motorola', 'phone', 1995, 2015, ALL, 4, ['tech', 'mass'], ['ad', 'jingle'], 'Celulares com ringtone pré-instalado.', 'Phones with preinstalled ringtones.'),
  br_('b_galaxy', 'Stellar Mobile', 'Samsung', 'phone', 2000, undefined, ALL, 5, ['tech', 'youth'], ['ad'], 'Lançamentos de celular com shows exclusivos.', 'Phone launches with exclusive gigs.'),
  br_('b_neuro', 'SynapseOne', undefined, 'tech', 2034, undefined, ALL, 5, ['tech', 'luxury'], ['ad'], 'Fabricante de interfaces neurais; quer trilhas "adaptativas".', 'Neural interface maker; wants "adaptive" scores.'),
  br_('b_mouse', 'Castelo Studios', 'Disney', 'film_studio', 1923, undefined, ALL, 5, ['family'], ['film', 'trailer', 'tv'], 'Animações familiares; trilhas que viram clássico.', 'Family animation; soundtracks that become classics.'),
  br_('b_lion', 'Lion Gate Pictures', 'MGM', 'film_studio', 1924, undefined, ALL, 5, ['tradition', 'luxury'], ['film', 'trailer'], 'Musicais de Hollywood com orquestra.', 'Hollywood musicals with orchestra.'),
  br_('b_indiefilm', 'Lantern Films', 'A24 / Miramax', 'film_studio', 1979, undefined, ['na', 'eu'], 3, ['edgy'], ['film', 'trailer'], 'Cinema independente; licencia indie e cult.', 'Indie cinema; licenses indie and cult tracks.'),
  br_('b_bolly', 'Chitra Talkies', 'Yash Raj Films', 'film_studio', 1934, undefined, ['asia'], 4, ['family', 'national'], ['film'], 'Filmes musicais com seis canções por roteiro.', 'Musical films with six songs per script.'),
  br_('b_tvnet', 'Rede Horizonte', 'TV Globo', 'novela', 1965, undefined, ['br', 'latam'], 5, ['family', 'mass', 'national'], ['novela', 'tv'], 'Novela das oito: a música-tema vira o hit do ano.', 'Prime-time soap: the theme song becomes the hit of the year.'),
  br_('b_televisa', 'Telemundo Sol', 'Televisa', 'novela', 1955, undefined, ['latam'], 4, ['family', 'mass'], ['novela', 'tv'], 'Telenovelas exportadas para 100 países.', 'Telenovelas exported to 100 countries.'),
  br_('b_network', 'National Broadcasting Group', 'NBC / CBS', 'tv_network', 1940, undefined, ['na'], 5, ['mass'], ['tv', 'ad'], 'Séries de horário nobre e aberturas cantadas.', 'Prime-time series and sung openings.'),
  br_('b_cable', 'Prism Premium', 'HBO', 'tv_network', 1972, undefined, ['na', 'eu', 'latam'], 4, ['edgy', 'luxury'], ['tv', 'trailer'], 'Séries premium; uma cena com sua música revive catálogos.', 'Premium series; one scene with your song revives catalogs.'),
  br_('b_stream_orig', 'Streamflix', 'Netflix', 'streaming_original', 2013, undefined, ALL, 5, ['youth', 'mass'], ['tv', 'film', 'trailer'], 'Séries que jogam músicas antigas no topo das paradas.', 'Series that put old songs back on top of the charts.'),
  br_('b_game1', 'Ninbo Games', 'Nintendo', 'game_studio', 1983, undefined, ALL, 4, ['family', 'youth'], ['game'], 'Videogames familiares; temas de 8 bits.', 'Family video games; 8-bit themes.'),
  br_('b_game2', 'Rocket Street Games', 'Rockstar / EA Sports', 'game_studio', 1997, undefined, ALL, 4, ['edgy', 'youth', 'sport'], ['game', 'trailer'], 'Rádios fictícias no jogo e trilhas de futebol.', 'In-game radio stations and football soundtracks.'),
  br_('b_game3', 'Fortaleza Online', 'Fortnite / Roblox', 'game_studio', 2017, undefined, ALL, 5, ['youth'], ['game'], 'Shows virtuais dentro do jogo para milhões.', 'Virtual in-game concerts for millions.'),
  br_('b_agency1', 'Sterling & Crane', 'Ogilvy / McCann', 'ad_agency', 1925, undefined, ['na', 'eu', 'br'], 4, ['mass'], ['ad', 'jingle'], 'Agência que compra jingles por atacado.', 'Agency that buys jingles wholesale.'),
  br_('b_agency2', 'Nova Ideia Propaganda', 'DPZ / Africa Creative', 'ad_agency', 1968, undefined, ['br', 'latam'], 3, ['national', 'youth'], ['ad', 'jingle'], 'Agência brasileira de campanhas emocionais.', 'Brazilian agency of emotional campaigns.'),
  br_('b_fashion1', 'Maison Verlaine', 'Chanel / Louis Vuitton', 'fashion', 1925, undefined, ['eu', 'asia', 'na'], 5, ['luxury'], ['ad'], 'Grifes que querem embaixadores com aura de arte.', 'Fashion houses that want ambassadors with an art aura.'),
  br_('b_fashion2', 'Street Kode', 'Supreme / Off-White', 'fashion', 1994, undefined, ['na', 'eu', 'asia'], 3, ['edgy', 'youth'], ['ad'], 'Drops limitados com rappers e skatistas.', 'Limited drops with rappers and skaters.'),
  br_('b_cosmetic', 'Belle Lumière', 'L\'Oréal / Avon', 'cosmetics', 1930, undefined, ALL, 4, ['family', 'mass'], ['ad', 'novela'], 'Campanhas de beleza com cantoras pop.', 'Beauty campaigns with pop singers.'),
  br_('b_airline', 'Panorama Airways', 'Pan Am / Varig', 'airline', 1930, 2006, ALL, 4, ['luxury', 'tradition'], ['ad', 'jingle'], 'Jingles de "voe com a gente" e música de bordo.', '"Fly with us" jingles and in-flight music.'),
  br_('b_bank', 'Banco Atlântico', 'Itaú / Santander', 'bank', 1945, undefined, ['br', 'latam', 'eu'], 4, ['tradition', 'family'], ['ad'], 'Patrocina festivais e turnês "pela cultura".', 'Sponsors festivals and tours "for culture".'),
  br_('b_fintech', 'PayNow', 'Nubank / Revolut', 'bank', 2013, undefined, ['br', 'eu', 'latam'], 3, ['youth', 'tech'], ['ad'], 'Banco digital que patrocina festivais de verão.', 'Digital bank sponsoring summer festivals.'),
  br_('b_food', 'Crunchy Corn', 'Kellogg\'s / Doritos', 'food', 1930, undefined, ALL, 4, ['family', 'mass'], ['ad', 'jingle'], 'Salgadinhos e cereais com mascote cantor.', 'Snacks and cereal with a singing mascot.'),
  br_('b_burger', 'Golden Burger', 'McDonald\'s', 'food', 1955, undefined, ALL, 5, ['family', 'mass', 'youth'], ['ad', 'jingle'], 'Combos com nome de artista vendem milhões.', 'Artist-named meals sell millions.'),
  br_('b_energy', 'Volt Rush', 'Red Bull / Monster', 'soft_drink', 1987, undefined, ALL, 4, ['edgy', 'sport', 'youth'], ['ad', 'tv'], 'Bancam festivais eletrônicos e academias de música.', 'Fund electronic festivals and music academies.'),
  br_('b_eco', 'Verde Vivo', 'Natura / Patagonia', 'cosmetics', 1969, undefined, ['br', 'latam', 'na'], 3, ['eco', 'family'], ['ad'], 'Marca sustentável; exige artista "coerente".', 'Sustainable brand; demands a "consistent" artist.'),
  br_('b_k_beauty', 'Hanbit Beauty', 'Amorepacific / Innisfree', 'cosmetics', 1995, undefined, ['asia'], 4, ['youth', 'luxury'], ['ad'], 'Contrata grupos de ídolos inteiros.', 'Hires entire idol groups.'),
  br_('b_jingle_radio', 'Café Aroma Forte', 'Café Pilão / Nescafé', 'food', 1938, undefined, ['br', 'latam', 'eu'], 3, ['tradition', 'family'], ['jingle', 'ad'], 'Patrocinador de programas de auditório no rádio.', 'Sponsor of radio audience shows.'),
  br_('b_telco', 'TelOnda', 'Vivo / Claro / Vodafone', 'phone', 1998, undefined, ['br', 'latam', 'eu', 'africa'], 4, ['mass', 'youth'], ['ad'], 'Operadora que vende ringtones e patrocina shows.', 'Carrier that sells ringtones and sponsors shows.'),
  br_('b_afro_tel', 'Savanna Mobile', 'MTN / Safaricom', 'phone', 2000, undefined, ['africa'], 4, ['mass', 'national'], ['ad', 'jingle'], 'Maior patrocinador de música do continente.', 'The continent\'s biggest music sponsor.'),
  br_('b_ai_lab', 'Latent Labs', undefined, 'tech', 2029, undefined, ALL, 5, ['tech'], ['ad', 'game'], 'Laboratório de IA que quer "parcerias criativas" (e dados).', 'AI lab seeking "creative partnerships" (and data).'),
  br_('b_holo', 'Hologramma', undefined, 'tech', 2031, undefined, ['na', 'asia', 'eu'], 4, ['tech', 'youth'], ['ad', 'tv'], 'Shows de hologramas e avatares licenciados.', 'Hologram shows and licensed avatars.'),
];

// =====================================================================================
// PREMIAÇÕES (além dos Gramófonos de Ouro)
// =====================================================================================
export type AwardCriterion = 'critics' | 'sales' | 'peer' | 'popular_vote' | 'jury' | 'industry';
export type AwardKind = 'critics' | 'regional' | 'industry' | 'hall_of_fame' | 'genre' | 'popular' | 'video' | 'live';

export interface AwardCategory {
  id: string;
  name: L;
  /** famílias elegíveis (vazio = todas) */
  families?: FamilyId[];
}

export interface AwardDef {
  id: string;
  name: string;
  realRef?: string;
  kind: AwardKind;
  market: MarketId | 'global';
  start: number;
  end?: number;
  /** mês da cerimônia (0 = janeiro) */
  month: number;
  criteria: AwardCriterion[];
  prestige: number;
  categories: AwardCategory[];
  desc: L;
  /** tecnologia exigida (ex.: 'clipnet' para prêmios de clipe) */
  tech?: string;
}

const cat = (id: string, pt: string, en: string, families?: FamilyId[]): AwardCategory => ({ id, name: l(pt, en), families });
const aw = (id: string, name: string, realRef: string | undefined, kind: AwardKind, market: AwardDef['market'], start: number, month: number, criteria: AwardCriterion[], prestige: number, categories: AwardCategory[], pt: string, en: string, extra: Partial<AwardDef> = {}): AwardDef =>
  ({ id, name, realRef, kind, market, start, month, criteria, prestige, categories, desc: l(pt, en), ...extra });

export const AWARDS: AwardDef[] = [
  aw('gramofonos', 'Gramófonos de Ouro', 'Grammy Awards', 'industry', 'global', 1959, 1, ['peer', 'industry'], 95, [
    cat('record', 'Gravação do ano', 'Record of the year'), cat('album', 'Álbum do ano', 'Album of the year'), cat('song', 'Canção do ano', 'Song of the year'), cat('new_artist', 'Revelação', 'Best new artist'),
  ], 'A premiação central da indústria (já existente no jogo).', 'The industry\'s central award (already in the game).'),
  aw('critics_poll', 'Votação da Crítica Agulha', 'Pazz & Jop / Mercury Prize', 'critics', 'global', 1971, 0, ['critics'], 80, [
    cat('album', 'Álbum da crítica', 'Critics\' album'), cat('single', 'Single da crítica', 'Critics\' single'), cat('debut', 'Estreia mais ousada', 'Boldest debut'),
  ], 'Centenas de críticos votam; vendas não contam nada.', 'Hundreds of critics vote; sales count for nothing.'),
  aw('shortlist_prize', 'Prêmio Lista Curta', 'Mercury Prize / Polaris Prize', 'critics', 'eu', 1992, 8, ['jury', 'critics'], 78, [
    cat('album', 'Álbum do ano (júri)', 'Album of the year (jury)'), cat('shortlist', 'Indicação à lista curta', 'Shortlist nomination'),
  ], 'Júri escolhe 12 discos; o vencedor triplica as vendas.', 'A jury picks 12 records; the winner triples its sales.'),
  aw('trofeu_vitrola', 'Troféu Vitrola de Ouro', 'Prêmio da Música Brasileira / Troféu Imprensa', 'regional', 'br', 1958, 4, ['jury', 'popular_vote'], 72, [
    cat('cantor', 'Melhor cantor(a)', 'Best singer', ['brazil', 'pop']), cat('samba', 'Melhor samba', 'Best samba', ['brazil']), cat('sertanejo', 'Melhor sertanejo', 'Best sertanejo', ['brazil', 'country_folk']), cat('revelacao', 'Revelação', 'Breakthrough'),
  ], 'O prêmio brasileiro, com votação de imprensa e público.', 'The Brazilian award, voted by press and public.'),
  aw('latin_sol', 'Prêmios Sol Latino', 'Latin Grammy / Premios Lo Nuestro', 'regional', 'latam', 1989, 10, ['peer', 'popular_vote'], 76, [
    cat('record', 'Gravação do ano latina', 'Latin record of the year', ['latin', 'caribbean', 'brazil']), cat('urban', 'Melhor álbum urbano', 'Best urban album', ['caribbean', 'hiphop', 'latin']), cat('tropical', 'Melhor tropical', 'Best tropical', ['latin', 'caribbean']), cat('regional_mx', 'Melhor regional mexicano', 'Best regional Mexican', ['latin']),
  ], 'Toda a América Latina e Ibéria numa noite.', 'All of Latin America and Iberia in one night.'),
  aw('euro_stage', 'Prêmios Palco Europeu', 'MTV EMA / BRIT Awards', 'regional', 'eu', 1977, 1, ['sales', 'popular_vote', 'peer'], 74, [
    cat('british_group', 'Melhor grupo europeu', 'Best European group'), cat('solo', 'Melhor artista solo', 'Best solo artist'), cat('breakthrough', 'Revelação europeia', 'European breakthrough'),
  ], 'Gala britânica-europeia com discursos que viram manchete.', 'British-European gala with speeches that make headlines.'),
  aw('asia_star', 'Golden Disc Ásia', 'Golden Disc Awards / MAMA / Japan Record Award', 'regional', 'asia', 1959, 11, ['sales', 'popular_vote'], 74, [
    cat('daesang', 'Grande prêmio (daesang)', 'Grand prize (daesang)', ['pop', 'asia_me']), cat('rookie', 'Novato do ano', 'Rookie of the year'), cat('enka', 'Melhor enka/trot', 'Best enka/trot', ['asia_me']),
  ], 'Votação de fãs que mobiliza fandoms inteiros.', 'Fan voting that mobilizes entire fandoms.'),
  aw('africa_crown', 'Coroa Africana da Música', 'AFRIMA / Kora Awards / MAMAs', 'regional', 'africa', 1994, 10, ['jury', 'popular_vote'], 68, [
    cat('artist', 'Artista africano do ano', 'African artist of the year', ['africa']), cat('collab', 'Melhor colaboração', 'Best collaboration'), cat('diaspora', 'Melhor artista da diáspora', 'Best diaspora artist'),
  ], 'Celebra o continente e sua diáspora.', 'Celebrates the continent and its diaspora.'),
  aw('southern_cross', 'Prêmios Cruzeiro do Sul', 'ARIA Awards / NZ Music Awards', 'regional', 'oceania', 1987, 10, ['peer', 'sales'], 62, [
    cat('album', 'Álbum do ano', 'Album of the year'), cat('breakthrough', 'Revelação', 'Breakthrough'), cat('live', 'Melhor show', 'Best live act'),
  ], 'Oceania premia os seus, de pub rock a eletrônica.', 'Oceania honors its own, from pub rock to electronic.'),
  aw('country_assoc', 'Prêmios da Associação Country', 'CMA Awards', 'genre', 'na', 1967, 10, ['peer'], 70, [
    cat('entertainer', 'Artista do ano', 'Entertainer of the year', ['country_folk']), cat('vocal_duo', 'Melhor dupla', 'Best vocal duo', ['country_folk']),
  ], 'O Nashville vota em si mesmo.', 'Nashville votes for itself.'),
  aw('soul_train', 'Prêmios Groove', 'Soul Train Awards / BET Awards', 'genre', 'na', 1987, 2, ['popular_vote', 'peer'], 70, [
    cat('rnb', 'Melhor R&B', 'Best R&B', ['rnb']), cat('hiphop', 'Melhor hip hop', 'Best hip hop', ['hiphop']), cat('gospel', 'Melhor gospel', 'Best gospel', ['sacred']),
  ], 'Celebração de R&B, hip hop e gospel.', 'A celebration of R&B, hip hop and gospel.'),
  aw('video_awards', 'Prêmios ClipNet de Vídeo', 'MTV Video Music Awards', 'video', 'global', 1984, 8, ['popular_vote', 'jury'], 68, [
    cat('video', 'Clipe do ano', 'Video of the year'), cat('direction', 'Melhor direção', 'Best direction'), cat('choreo', 'Melhor coreografia', 'Best choreography'),
  ], 'Polêmica no palco faz parte do roteiro.', 'Onstage controversy is part of the script.', { tech: 'clipnet' }),
  aw('industry_guild', 'Prêmios da Guilda AMIF', 'Music Week Awards / A&R Awards', 'industry', 'global', 1975, 3, ['industry'], 60, [
    cat('anr', 'A&R do ano', 'A&R of the year'), cat('label', 'Selo do ano', 'Label of the year'), cat('producer', 'Produtor do ano', 'Producer of the year'), cat('manager', 'Empresário do ano', 'Manager of the year'),
  ], 'Os bastidores se premiam: selos, A&Rs e produtores.', 'Behind the scenes honors itself: labels, A&Rs and producers.'),
  aw('live_awards', 'Prêmios do Circuito', 'Pollstar Awards', 'live', 'global', 1989, 1, ['sales', 'industry'], 58, [
    cat('tour', 'Turnê do ano', 'Tour of the year'), cat('live_act', 'Melhor ao vivo', 'Best live act'), cat('festival', 'Festival do ano', 'Festival of the year'),
  ], 'Bilheteria e público decidem.', 'Box office and attendance decide.'),
  aw('hall_echoes', 'Hall of Echoes', 'Rock & Roll Hall of Fame', 'hall_of_fame', 'global', 1986, 3, ['peer', 'critics'], 90, [
    cat('performer', 'Intérprete', 'Performer'), cat('influence', 'Influência inicial', 'Early influence'), cat('nonperformer', 'Bastidores (produtores, executivos)', 'Non-performer (producers, executives)'),
  ], 'Exige 25 anos desde a estreia (já existente no jogo).', 'Requires 25 years since debut (already in the game).'),
  aw('songwriters_hall', 'Salão dos Compositores', 'Songwriters Hall of Fame', 'hall_of_fame', 'global', 1969, 5, ['peer'], 78, [
    cat('songwriter', 'Compositor(a)', 'Songwriter'), cat('song_classic', 'Canção clássica', 'Classic song'),
  ], 'Honra quem escreve, não quem canta.', 'Honors who writes, not who sings.'),
  aw('people_choice', 'Voto do Povo', 'People\'s Choice / Kids\' Choice Awards', 'popular', 'global', 1975, 0, ['popular_vote'], 50, [
    cat('fav_artist', 'Artista favorito', 'Favorite artist'), cat('fav_song', 'Canção favorita', 'Favorite song'), cat('fandom', 'Melhor fandom', 'Best fandom'),
  ], 'Votação aberta; fandoms organizados dominam.', 'Open voting; organized fandoms dominate.'),
  aw('human_mark', 'Selo Feito por Humanos', undefined, 'critics', 'global', 2033, 6, ['jury', 'critics'], 70, [
    cat('album', 'Álbum humano do ano', 'Human album of the year'), cat('performance', 'Performance sem rede', 'Performance without a net'),
  ], 'Prêmio do movimento contra música gerada.', 'The award of the movement against generated music.'),
];

// =====================================================================================
// MOVIMENTOS culturais (geram subgêneros nomeados numa cidade)
// =====================================================================================
export interface MovementDef {
  id: string;
  /** gêneros de origem (ids de GENRES) */
  parents: string[];
  markets: MarketId[];
  /** cidades com afinidade (ids de CITIES) */
  cities: string[];
  from: number;
  to: number;
  /** padrões de nome; {city} = nome da cidade, {parent} = gênero de origem, {adj} = palavra da era */
  namePatterns: { pt: string[]; en: string[] };
  aesthetic: string[];
  look: L;
  desc: L;
}

const mv = (id: string, parents: string[], markets: MarketId[], cities: string[], from: number, to: number, npt: string[], nen: string[], aesthetic: string[], lpt: string, len: string, dpt: string, den: string): MovementDef =>
  ({ id, parents, markets, cities, from, to, namePatterns: { pt: npt, en: nen }, aesthetic, look: l(lpt, len), desc: l(dpt, den) });

export const MOVEMENTS: MovementDef[] = [
  mv('mv_speakeasy', ['hot_jazz', 'stride'], ['na'], ['new_york', 'chicago', 'kansas_city'], 1920, 1935, ['jazz de porão de {city}', '{parent} clandestino'], ['{city} cellar jazz', 'speakeasy {parent}'], ['nightlife', 'improvisation', 'brass'], 'Ternos risca de giz, vestidos de franja, chapéus cloche.', 'Pinstripe suits, fringe dresses, cloche hats.', 'Bares escondidos e orquestras que tocam até de manhã.', 'Hidden bars and bands playing till dawn.'),
  mv('mv_radio_auditorio', ['samba_cancao', 'marchinha'], ['br'], ['rio', 'sao_paulo'], 1935, 1958, ['samba de auditório de {city}', '{parent} do rádio'], ['{city} radio-hall {parent}', 'radio {parent}'], ['radio', 'fan_clubs', 'glamour'], 'Vestidos de cetim, smokings e fotos autografadas.', 'Satin gowns, tuxedos and signed photos.', 'Cantoras do rádio, fã-clubes rivais e auditórios lotados.', 'Radio queens, rival fan clubs and packed studios.'),
  mv('mv_existential', ['chanson', 'cool_jazz'], ['eu'], ['paris', 'brussels'], 1945, 1962, ['chanson de porão de {city}', 'rive gauche {parent}'], ['{city} cellar chanson', 'left-bank {parent}'], ['poetry', 'cafés', 'black_clothes'], 'Golas rulê pretas, cigarrilhas de chocolate e boinas.', 'Black turtlenecks, chocolate cigarillos and berets.', 'Poetas e cantores em porões enfumaçados de ideias.', 'Poets and singers in idea-filled cellars.'),
  mv('mv_skiffle_craze', ['skiffle', 'rnr'], ['eu', 'oceania'], ['liverpool', 'london', 'hamburg', 'glasgow'], 1955, 1963, ['febre skiffle de {city}', '{parent} de tábua de lavar'], ['{city} skiffle craze', 'washboard {parent}'], ['diy', 'teenagers', 'acoustic'], 'Topetes, jaquetas de couro, tábuas de lavar como instrumento.', 'Quiffs, leather jackets, washboards as instruments.', 'Adolescentes com instrumentos improvisados formam mil bandas.', 'Teens with makeshift instruments form a thousand bands.'),
  mv('mv_psychedelic', ['psychedelic', 'folk'], ['na', 'eu', 'latam', 'asia'], ['san_francisco', 'london', 'istanbul', 'lima'], 1965, 1972, ['psicodelia de {city}', '{parent} lisérgico'], ['{city} psychedelia', 'kaleidoscope {parent}'], ['light_shows', 'communes', 'long_jams'], 'Batas floridas, óculos redondos, cartazes fluorescentes.', 'Flowered tunics, round glasses, fluorescent posters.', 'Shows de luz, jams longas e comunidades.', 'Light shows, long jams and communes.'),
  mv('mv_tropical_protest', ['mpb', 'nueva_cancion'], ['br', 'latam'], ['rio', 'sao_paulo', 'santiago', 'buenos_aires'], 1965, 1985, ['canção de resistência de {city}', '{parent} engajada'], ['{city} protest song', 'committed {parent}'], ['protest', 'poetry', 'festivals'], 'Violões, ponchos, roupas de brechó e cabelos longos.', 'Acoustic guitars, ponchos, thrift clothes and long hair.', 'Metáforas para driblar a censura em festivais televisionados.', 'Metaphors to dodge censorship at televised festivals.'),
  mv('mv_sound_system', ['reggae', 'dub'], ['latam', 'eu', 'africa'], ['kingston', 'london', 'bristol', 'birmingham'], 1970, 1995, ['sound system de {city}', '{parent} de rua'], ['{city} sound system', 'street {parent}'], ['speakers', 'toasting', 'dubplates'], 'Gorros tricolores, paredes de caixas de som, dubplates.', 'Tricolor knit hats, speaker walls, dubplates.', 'Paredes de som nas ruas e disputas de DJs.', 'Speaker walls in the streets and DJ clashes.'),
  mv('mv_punk_diy', ['punk', 'hardcore_punk'], ['na', 'eu', 'br', 'oceania'], ['london', 'new_york', 'sao_paulo', 'washington', 'brisbane'], 1976, 1990, ['punk de garagem de {city}', '{parent} faça-você-mesmo'], ['{city} DIY punk', 'do-it-yourself {parent}'], ['fanzines', 'diy', 'speed'], 'Alfinetes, coturnos, moicanos e jaquetas pintadas.', 'Safety pins, boots, mohawks and painted jackets.', 'Fanzines xerocados, selos de garagem e shows de 20 minutos.', 'Photocopied zines, garage labels and 20-minute gigs.'),
  mv('mv_rave', ['acid_house', 'techno'], ['eu', 'na'], ['manchester', 'berlin', 'detroit', 'ibiza', 'london'], 1987, 1999, ['rave de {city}', '{parent} de galpão'], ['{city} rave', 'warehouse {parent}'], ['warehouses', 'smileys', 'all_night'], 'Smileys amarelos, bandanas, roupas largas e apitos.', 'Yellow smileys, bandanas, baggy clothes and whistles.', 'Festas em galpões até o sol nascer.', 'Warehouse parties until sunrise.'),
  mv('mv_mangue', ['mangue', 'baiao'], ['br'], ['recife', 'belem', 'fortaleza'], 1991, 2005, ['mangue de {city}', '{parent} com antena parabólica'], ['{city} mangue', 'satellite-dish {parent}'], ['crabs', 'regional_meets_global', 'zines'], 'Chapéus de palha, óculos escuros e camisas floridas.', 'Straw hats, sunglasses and floral shirts.', 'Maracatu encontra guitarra e hip hop.', 'Maracatu meets guitar and hip hop.'),
  mv('mv_bedroom', ['bedroom_pop', 'lofi_hiphop'], ['na', 'eu', 'asia', 'oceania'], ['los_angeles', 'melbourne', 'seoul', 'toronto'], 2012, 2030, ['{parent} de quarto de {city}', 'pop de quarto'], ['{city} bedroom {parent}', 'bedroom-made {parent}'], ['laptop', 'intimacy', 'nostalgia'], 'Moletons, luzes de LED, câmeras descartáveis.', 'Hoodies, LED strips, disposable cameras.', 'Discos feitos no quarto viram fenômenos de streaming.', 'Bedroom-made records become streaming phenomena.'),
  mv('mv_baile', ['funk_carioca', 'brega_funk'], ['br'], ['rio', 'sao_paulo', 'recife', 'belem'], 2000, 2040, ['funk de baile de {city}', '{parent} de quebrada'], ['{city} baile {parent}', 'favela {parent}'], ['paredões', 'mc_battles', 'dance'], 'Correntes, bonés de aba reta, óculos espelhados, unhas decoradas.', 'Chains, flat-brim caps, mirrored glasses, decorated nails.', 'Paredões de som e bailes que lançam MCs semanais.', 'Sound walls and parties that launch MCs every week.'),
  mv('mv_amapiano_wave', ['amapiano', 'gqom'], ['africa', 'eu'], ['johannesburg', 'durban', 'lagos', 'london'], 2016, 2040, ['{parent} de township de {city}', 'piano de {city}'], ['{city} township {parent}', '{city} piano'], ['log_drums', 'dance_challenges', 'diaspora'], 'Bucket hats, roupas de grife misturadas com tradicionais.', 'Bucket hats, designer clothes mixed with traditional ones.', 'Log drums e desafios de dança cruzam continentes.', 'Log drums and dance challenges cross continents.'),
  mv('mv_corridos', ['corridos_tumbados', 'norteno'], ['latam', 'na'], ['guadalajara', 'monterrey', 'los_angeles'], 2018, 2040, ['corrido novo de {city}', '{parent} tumbado'], ['{city} new corrido', 'tumbado {parent}'], ['requinto', 'trap', 'streetwear'], 'Chapéus de caubói com roupas de grife.', 'Cowboy hats with designer streetwear.', 'Violões de 12 cordas e flow de trap.', '12-string guitars and trap flow.'),
  mv('mv_hyperspeed', ['hyperpop', 'phonk', 'jersey_club'], ['na', 'eu', 'asia', 'br'], ['chicago', 'london', 'sao_paulo', 'seoul'], 2019, 2035, ['{parent} acelerado de {city}', 'sped-up {parent}'], ['{city} sped-up {parent}', 'nightcore {parent}'], ['short_video', 'speed', 'glitch'], 'Cabelos coloridos, piercings, estética de anime e glitch.', 'Colored hair, piercings, anime and glitch aesthetics.', 'Trechos acelerados de 15 segundos viram gênero.', '15-second sped-up snippets become a genre.'),
  mv('mv_latent', ['latent_core', 'synthetic'], ['asia', 'na', 'eu'], ['tokyo', 'seoul', 'los_angeles', 'berlin'], 2031, 2040, ['latent de {city}', '{parent} de espaço latente'], ['{city} latent', 'latent-space {parent}'], ['prompts', 'glitch', 'infinite_variations'], 'Roupas que mudam de cor por app, máscaras de LED.', 'App-controlled color-changing clothes, LED masks.', 'Músicas que nunca tocam igual duas vezes.', 'Songs that never play the same twice.'),
  mv('mv_handmade', ['handmade_rock', 'folk'], ['eu', 'na', 'br', 'oceania'], ['dublin', 'lisbon', 'austin', 'porto_alegre', 'wellington'], 2031, 2040, ['rock artesanal de {city}', '{parent} sem rede'], ['{city} handmade rock', 'no-net {parent}'], ['analog', 'imperfection', 'certification'], 'Lã, linho, instrumentos de madeira com marcas de uso.', 'Wool, linen, wooden instruments with wear marks.', 'Bandas que provam ser humanas tocando sem edição.', 'Bands proving they are human by playing unedited.'),
  mv('mv_consent', ['consent_wave', 'alt_rnb'], ['na', 'eu', 'br', 'africa'], ['toronto', 'london', 'sao_paulo', 'lagos'], 2033, 2040, ['consent-wave de {city}', '{parent} consentido'], ['{city} consent-wave', 'consented {parent}'], ['ethics', 'voice_rights', 'intimacy'], 'Selos de consentimento bordados nas roupas.', 'Consent seals embroidered on clothes.', 'Cantores que licenciam a própria voz com regras públicas.', 'Singers who license their own voice under public rules.'),
  mv('mv_dreamfeed', ['dream_feed', 'bio_ambient'], ['asia', 'eu', 'na'], ['tokyo', 'reykjavik', 'stockholm', 'san_francisco'], 2037, 2040, ['dream-feed de {city}', '{parent} noturno'], ['{city} dream-feed', 'nocturnal {parent}'], ['sleep', 'neural', 'wellness'], 'Pijamas de grife, tiaras neurais minimalistas.', 'Designer pajamas, minimalist neural headbands.', 'Música feita para ser sonhada.', 'Music made to be dreamt.'),
  mv('mv_desert', ['desert_blues', 'rai'], ['africa', 'eu'], ['bamako', 'oran', 'marseille', 'casablanca'], 1980, 2025, ['blues de {city}', '{parent} do Saara'], ['{city} blues', 'Saharan {parent}'], ['trance_guitar', 'nomad', 'protest'], 'Turbantes índigo, túnicas e guitarras surradas.', 'Indigo turbans, robes and worn guitars.', 'Guitarras hipnóticas sobre ritmos nômades.', 'Hypnotic guitars over nomadic rhythms.'),
  mv('mv_city_pop', ['city_pop', 'opm'], ['asia'], ['tokyo', 'osaka', 'manila', 'taipei'], 1976, 1992, ['pop de avenida de {city}', '{parent} de cobertura'], ['{city} skyline pop', 'penthouse {parent}'], ['cars', 'neon', 'prosperity'], 'Ombreiras, óculos aviador e carros conversíveis.', 'Shoulder pads, aviators and convertibles.', 'Prosperidade urbana em acordes com sétima maior.', 'Urban prosperity in major-seventh chords.'),
];

// =====================================================================================
// GEOPOLÍTICA: guerras, regimes, censura, embargos, choques econômicos
// =====================================================================================
export type GeoKind = 'war' | 'dictatorship' | 'censorship' | 'embargo' | 'oil_crisis' | 'recession' | 'pandemic' | 'cold_war' | 'segregation' | 'revolution' | 'hyperinflation' | 'boom' | 'reunification' | 'sanctions' | 'occupation' | 'curfew';
export type CensorTag = 'political' | 'sexual' | 'drugs' | 'religious' | 'foreign' | 'protest' | 'violence' | 'western' | 'decadent' | 'regional_language';

export interface GeoEffects {
  /** 0 = livre … 1 = censura total */
  censorshipLevel: number;
  bannedTags: CensorTag[];
  /** multiplicador de demanda de música no mercado afetado */
  demandMult: number;
  touringBlocked?: boolean;
  /** inflação extra ao ano (0.2 = +20%) */
  inflationShock?: number;
  /** desvalorização cambial no período (0.3 = −30%) */
  currencyShock?: number;
  /** exportação de discos para fora bloqueada */
  exportBlocked?: boolean;
  /** importação de música estrangeira bloqueada/limitada */
  importBlocked?: boolean;
}

export interface GeoEvent {
  id: string;
  name: L;
  kind: GeoKind;
  markets: MarketId[];
  /** cidades mais afetadas (opcional) */
  cities?: string[];
  from: number;
  to: number;
  effects: GeoEffects;
  desc: L;
}

const ge = (id: string, pt: string, en: string, kind: GeoKind, markets: MarketId[], from: number, to: number, effects: GeoEffects, dpt: string, den: string, cities?: string[]): GeoEvent =>
  ({ id, name: l(pt, en), kind, markets, from, to, effects, desc: l(dpt, den), cities });
const fx = (censorshipLevel: number, bannedTags: CensorTag[], demandMult: number, extra: Partial<GeoEffects> = {}): GeoEffects => ({ censorshipLevel, bannedTags, demandMult, ...extra });

export const GEOPOLITICS: GeoEvent[] = [
  ge('geo_prohibition', 'Lei seca', 'Prohibition', 'censorship', ['na'], 1920, 1933, fx(0.1, ['drugs'], 1.05), 'Bares clandestinos viram palco do jazz.', 'Speakeasies become jazz stages.', ['new_york', 'chicago']),
  ge('geo_depression', 'Grande Depressão', 'Great Depression', 'recession', ['na', 'eu', 'latam', 'br', 'oceania'], 1929, 1938, fx(0, [], 0.55, { currencyShock: 0.2 }), 'Venda de discos despenca; rádio gratuito domina.', 'Record sales collapse; free radio rules.'),
  ge('geo_estado_novo', 'Estado Novo (Brasil)', 'Estado Novo (Brazil)', 'dictatorship', ['br'], 1937, 1945, fx(0.5, ['political', 'protest'], 0.95), 'Departamento oficial de propaganda revisa letras; samba exalta o trabalho.', 'An official propaganda department reviews lyrics; samba must praise work.', ['rio']),
  ge('geo_spain_war', 'Guerra Civil Espanhola', 'Spanish Civil War', 'war', ['eu'], 1936, 1939, fx(0.6, ['political'], 0.6, { touringBlocked: true }), 'Fronteiras fechadas e músicos no exílio.', 'Closed borders and musicians in exile.', ['madrid', 'barcelona']),
  ge('geo_franco', 'Regime franquista', 'Franco regime', 'dictatorship', ['eu'], 1939, 1975, fx(0.6, ['political', 'sexual', 'religious', 'regional_language'], 0.85), 'Censura prévia e línguas regionais reprimidas; a copla é a canção oficial.', 'Prior censorship and suppressed regional languages; copla is the official song.', ['madrid', 'barcelona', 'sevilla']),
  ge('geo_portugal', 'Estado Novo (Portugal)', 'Estado Novo (Portugal)', 'dictatorship', ['eu', 'africa'], 1933, 1974, fx(0.55, ['political', 'protest'], 0.85), 'Lápis azul da censura; fado vigiado, canção de intervenção clandestina.', 'The censor\'s blue pencil; watched fado, clandestine protest songs.', ['lisbon', 'porto', 'luanda', 'maputo']),
  ge('geo_ww2', 'Segunda Guerra Mundial', 'World War II', 'war', ['eu', 'asia', 'na', 'africa', 'oceania'], 1939, 1945, fx(0.5, ['foreign', 'decadent'], 0.6, { touringBlocked: true, inflationShock: 0.1 }), 'Racionamento de goma-laca, músicos convocados e rádio de guerra.', 'Shellac rationing, drafted musicians and wartime radio.'),
  ge('geo_occupation_paris', 'Ocupação de Paris', 'Occupation of Paris', 'occupation', ['eu'], 1940, 1944, fx(0.8, ['political', 'foreign', 'decadent'], 0.5, { touringBlocked: true }), 'Jazz considerado "degenerado"; swing vira resistência.', 'Jazz deemed "degenerate"; swing becomes resistance.', ['paris', 'brussels']),
  ge('geo_recording_ban', 'Greve de gravações', 'Recording ban', 'censorship', ['na'], 1942, 1944, fx(0, [], 0.8), 'O sindicato proíbe gravações instrumentais; vocalistas ganham espaço.', 'The union bans instrumental recording; vocalists gain ground.'),
  ge('geo_cold_war', 'Guerra Fria', 'Cold War', 'cold_war', ['eu', 'asia', 'na'], 1947, 1991, fx(0.2, ['political'], 0.95), 'Turnês culturais como diplomacia; discos contrabandeados em radiografias.', 'Cultural tours as diplomacy; records bootlegged on X-ray film.'),
  ge('geo_soviet_bloc', 'Bloco soviético: censura cultural', 'Soviet bloc cultural censorship', 'censorship', ['eu'], 1948, 1989, fx(0.75, ['political', 'western', 'decadent', 'religious'], 0.7, { importBlocked: true }), 'Comitês aprovam letras; rock ocidental circula clandestino.', 'Committees approve lyrics; Western rock circulates underground.', ['moscow', 'st_petersburg', 'warsaw', 'prague', 'budapest', 'kyiv']),
  ge('geo_mccarthy', 'Caça às bruxas', 'Red Scare blacklists', 'censorship', ['na'], 1950, 1956, fx(0.35, ['political', 'protest'], 1), 'Listas negras atingem folk e compositores engajados.', 'Blacklists hit folk and committed songwriters.'),
  ge('geo_segregation', 'Segregação e circuitos separados', 'Segregation and separate circuits', 'segregation', ['na'], 1920, 1965, fx(0.3, ['political'], 1, { touringBlocked: false }), 'Paradas e rádios "raciais"; turnês no Sul enfrentam leis segregacionistas.', '"Race" charts and radio; Southern tours face segregation laws.', ['memphis', 'new_orleans', 'atlanta']),
  ge('geo_apartheid', 'Apartheid', 'Apartheid', 'segregation', ['africa'], 1948, 1994, fx(0.7, ['political', 'protest', 'regional_language'], 0.8, { touringBlocked: true }), 'Rádios segregadas e boicote cultural internacional; artistas no exílio.', 'Segregated radio and an international cultural boycott; artists in exile.', ['johannesburg', 'cape_town', 'durban']),
  ge('geo_cuba_embargo', 'Embargo a Cuba', 'Cuba embargo', 'embargo', ['latam', 'na'], 1962, 2040, fx(0.4, ['political', 'foreign'], 0.9, { exportBlocked: true, importBlocked: true }), 'Discos cubanos não entram nos EUA; músicos dependem de selos estatais.', 'Cuban records barred from the US; musicians rely on state labels.', ['havana']),
  ge('geo_brazil_regime', 'Regime militar no Brasil', 'Brazilian military regime', 'dictatorship', ['br'], 1964, 1985, fx(0.65, ['political', 'protest', 'sexual'], 0.95), 'Censura prévia de letras (rigor máximo 1968–78); exílio e metáforas.', 'Prior censorship of lyrics (harshest 1968–78); exile and metaphors.', ['rio', 'sao_paulo', 'bh', 'salvador', 'brasilia']),
  ge('geo_greek_junta', 'Junta militar grega', 'Greek military junta', 'dictatorship', ['eu'], 1967, 1974, fx(0.7, ['political', 'protest'], 0.85), 'Compositores banidos e rebetiko vigiado.', 'Banned composers and policed rebetiko.', ['athens']),
  ge('geo_vietnam', 'Guerra do Vietnã', 'Vietnam War', 'war', ['asia', 'na'], 1964, 1975, fx(0.3, ['protest'], 0.95, { touringBlocked: true }), 'Canções de protesto nas paradas; tropas levam rock para Saigon.', 'Protest songs chart; troops bring rock to Saigon.', ['ho_chi_minh']),
  ge('geo_chile', 'Ditadura chilena', 'Chilean dictatorship', 'dictatorship', ['latam'], 1973, 1990, fx(0.8, ['political', 'protest', 'regional_language'], 0.8), 'Nueva canción proibida, instrumentos andinos malvistos, toque de recolher.', 'Nueva canción banned, Andean instruments frowned upon, curfews.', ['santiago']),
  ge('geo_argentina', 'Ditadura argentina', 'Argentine dictatorship', 'dictatorship', ['latam'], 1976, 1983, fx(0.75, ['political', 'protest', 'foreign'], 0.85), 'Listas de canções proibidas; em 1982 a música em inglês sai do rádio.', 'Lists of banned songs; in 1982 English-language music leaves the radio.', ['buenos_aires']),
  ge('geo_uruguay', 'Ditadura uruguaia', 'Uruguayan dictatorship', 'dictatorship', ['latam'], 1973, 1985, fx(0.7, ['political', 'protest'], 0.85), 'Murgas e candombe sob vigilância.', 'Murgas and candombe under watch.', ['montevideo']),
  ge('geo_oil_1973', 'Choque do petróleo', 'Oil crisis', 'oil_crisis', ['na', 'eu', 'asia', 'latam', 'br', 'oceania'], 1973, 1975, fx(0, [], 0.85, { inflationShock: 0.12 }), 'Vinil (derivado de petróleo) encarece; tiragens menores.', 'Vinyl (an oil product) gets expensive; smaller pressings.'),
  ge('geo_oil_1979', 'Segundo choque do petróleo', 'Second oil shock', 'oil_crisis', ['na', 'eu', 'asia', 'latam', 'br'], 1979, 1981, fx(0, [], 0.88, { inflationShock: 0.1 }), 'Custos de prensagem e turnê sobem de novo.', 'Pressing and touring costs climb again.'),
  ge('geo_iran', 'Revolução Iraniana', 'Iranian Revolution', 'revolution', ['asia'], 1979, 2040, fx(0.85, ['western', 'sexual', 'decadent', 'religious'], 0.6, { importBlocked: true }), 'Pop proibido em público, vozes femininas solo restritas; cena migra para a diáspora.', 'Pop banned in public, solo female voices restricted; the scene moves to the diaspora.', ['tehran']),
  ge('geo_brazil_inflation', 'Hiperinflação brasileira', 'Brazilian hyperinflation', 'hyperinflation', ['br'], 1985, 1994, fx(0, [], 0.8, { inflationShock: 1.5, currencyShock: 0.5 }), 'Preço do disco muda toda semana; cachês em dólar.', 'Record prices change weekly; fees quoted in dollars.'),
  ge('geo_latam_debt', 'Década perdida', 'Lost decade (debt crisis)', 'recession', ['latam'], 1982, 1990, fx(0, [], 0.8, { inflationShock: 0.5, currencyShock: 0.4 }), 'Crise da dívida; selos multinacionais saem do mercado.', 'Debt crisis; multinational labels leave the market.'),
  ge('geo_wall_falls', 'Queda do Muro e reunificação', 'Fall of the Wall and reunification', 'reunification', ['eu'], 1989, 1992, fx(0, [], 1.15), 'Novos mercados abrem; clubes ocupam prédios vazios.', 'New markets open; clubs squat empty buildings.', ['berlin', 'prague', 'warsaw', 'budapest']),
  ge('geo_yugoslav_wars', 'Guerras iugoslavas', 'Yugoslav Wars', 'war', ['eu'], 1991, 2001, fx(0.5, ['political'], 0.6, { touringBlocked: true, inflationShock: 2 }), 'Sanções, hiperinflação e o turbo-folk como trilha oficial.', 'Sanctions, hyperinflation and turbo-folk as the official soundtrack.', ['belgrade']),
  ge('geo_asia_crisis', 'Crise financeira asiática', 'Asian financial crisis', 'recession', ['asia'], 1997, 1999, fx(0, [], 0.8, { currencyShock: 0.4 }), 'Moedas despencam; o Estado aposta em exportar cultura pop.', 'Currencies crash; the state bets on exporting pop culture.', ['seoul', 'bangkok', 'jakarta', 'kuala_lumpur']),
  ge('geo_argentina_2001', 'Corralito argentino', 'Argentine "corralito"', 'recession', ['latam'], 2001, 2003, fx(0, [], 0.7, { currencyShock: 0.65 }), 'Saques bloqueados; shows pagos em moeda paralela.', 'Frozen bank accounts; shows paid in quasi-currency.', ['buenos_aires']),
  ge('geo_2008', 'Crise financeira global', 'Global financial crisis', 'recession', ['na', 'eu', 'latam', 'br', 'asia', 'oceania', 'africa'], 2008, 2010, fx(0, [], 0.85), 'Patrocínios cortados; turnês menores.', 'Sponsorships cut; smaller tours.'),
  ge('geo_arab_spring', 'Primavera Árabe', 'Arab Spring', 'revolution', ['africa', 'asia'], 2011, 2013, fx(0.4, ['political'], 0.85, { touringBlocked: true }), 'Rap de protesto viraliza; shows cancelados.', 'Protest rap goes viral; shows cancelled.', ['cairo', 'tunis', 'beirut']),
  ge('geo_pandemic', 'Pandemia global', 'Global pandemic', 'pandemic', ['na', 'eu', 'latam', 'br', 'asia', 'oceania', 'africa'], 2020, 2021, fx(0, [], 0.95, { touringBlocked: true }), 'Shows proibidos por meses; lives e streaming explodem.', 'Shows banned for months; livestreams and streaming explode.'),
  ge('geo_eastern_war', 'Guerra no Leste Europeu', 'War in Eastern Europe', 'war', ['eu'], 2022, 2026, fx(0.4, ['political', 'foreign'], 0.85, { touringBlocked: true, inflationShock: 0.08 }), 'Sanções, artistas cancelam turnês e plataformas saem do país.', 'Sanctions, artists cancel tours and platforms leave the country.', ['kyiv', 'moscow', 'st_petersburg']),
  ge('geo_neural_regulation', 'Lei de Proteção Neural', 'Neural Protection Act', 'censorship', ['eu', 'na', 'br'], 2037, 2040, fx(0.2, ['sexual', 'violence'], 0.95), 'Limites para conteúdo transmitido direto ao cérebro; selo etário neural.', 'Limits on brain-streamed content; neural age ratings.'),
  ge('geo_voice_treaty', 'Tratado das Vozes', 'Voice Rights Treaty', 'sanctions', ['eu', 'na', 'asia', 'br', 'latam', 'africa', 'oceania'], 2034, 2040, fx(0.1, [], 1), 'Clonar voz sem consentimento vira crime internacional.', 'Cloning a voice without consent becomes an international crime.'),
  ge('geo_heat_crisis', 'Verões extremos', 'Extreme summers', 'curfew', ['eu', 'na', 'oceania', 'asia'], 2030, 2040, fx(0, [], 0.97, { touringBlocked: false }), 'Festivais mudam de data; shows diurnos proibidos em ondas de calor.', 'Festivals move dates; daytime shows banned during heatwaves.'),
];

// =====================================================================================
// ERAS TECNOLÓGICAS (detalhe)
// =====================================================================================
export interface TechEraDef {
  id: string;
  name: L;
  /** id em TECHS (rules.ts), quando corresponde */
  tech?: string;
  start: number;
  peak: number;
  decline: number;
  end?: number;
  effects: {
    /** pirataria 0..1 */
    piracy: number;
    /** parcela física das vendas 0..1 no auge */
    physicalShare: number;
    /** viés para singles (1 = só singles, 0 = só álbuns) */
    singlesBias: number;
    /** custo relativo de gravar (1 = referência) */
    recordingCost: number;
    /** onde se descobre música */
    discovery: L;
  };
  desc: L;
}

const te = (id: string, pt: string, en: string, tech: string | undefined, start: number, peak: number, decline: number, end: number | undefined, piracy: number, physicalShare: number, singlesBias: number, recordingCost: number, dpt: string, den: string, ept: string, een: string): TechEraDef =>
  ({ id, name: l(pt, en), tech, start, peak, decline, end, effects: { piracy, physicalShare, singlesBias, recordingCost, discovery: l(dpt, den) }, desc: l(ept, een) });

export const TECH_ERAS: TechEraDef[] = [
  te('shellac78', 'Goma-laca 78 rpm', 'Shellac 78 rpm', undefined, 1920, 1935, 1950, 1960, 0.02, 0.95, 0.95, 1.2, 'Rádio, salões e partituras', 'Radio, ballrooms and sheet music', 'Três minutos por lado; discos quebram fácil.', 'Three minutes a side; records break easily.'),
  te('electric_rec', 'Gravação elétrica', 'Electrical recording', 'electric_rec', 1925, 1940, 1955, undefined, 0.02, 0.95, 0.9, 1.1, 'Rádio e cinema falado', 'Radio and talkies', 'Microfone muda o canto: nasce o crooner.', 'The microphone changes singing: the crooner is born.'),
  te('jukebox', 'Era da jukebox', 'Jukebox era', undefined, 1934, 1955, 1975, 1990, 0.03, 0.9, 1, 1, 'Bares, lanchonetes e operadores de rota', 'Bars, diners and route operators', 'Uma moeda, uma música: operadores escolhem os hits.', 'One coin, one song: operators pick the hits.'),
  te('vinyl_45_lp', 'Vinil 45 e LP', '45 and LP vinyl', 'lp', 1948, 1975, 1988, undefined, 0.05, 0.9, 0.5, 1, 'Rádio top 40, TV e lojas de discos', 'Top 40 radio, TV and record stores', 'Single para o rádio, LP como obra.', 'Single for radio, LP as the work.'),
  te('tape_multitrack', 'Fita multipista', 'Multitrack tape', 'multitrack', 1955, 1975, 1995, undefined, 0.05, 0.9, 0.5, 1.3, 'Estúdios como instrumento', 'Studios as instruments', 'Overdubs e o estúdio vira laboratório.', 'Overdubs; the studio becomes a lab.'),
  te('eight_track', 'Cartucho 8-track', '8-track cartridge', undefined, 1965, 1975, 1980, 1985, 0.1, 0.9, 0.3, 1, 'Rádio do carro', 'Car radio', 'Música no carro; troca de faixa no meio da canção.', 'Music in the car; tracks switch mid-song.'),
  te('cassette', 'Fita cassete', 'Cassette', 'cassette', 1964, 1988, 1998, 2005, 0.35, 0.85, 0.3, 1, 'Mixtapes, camelôs e rádio', 'Mixtapes, street stalls and radio', 'Gravar em casa: mixtapes e pirataria de rua.', 'Home taping: mixtapes and street piracy.'),
  te('walkman', 'Walkman', 'Walkman', undefined, 1979, 1989, 1999, undefined, 0.35, 0.85, 0.3, 1, 'Fones na rua', 'Headphones on the street', 'Música portátil e individual.', 'Portable, personal music.'),
  te('cd', 'CD', 'CD', 'cd', 1983, 2000, 2008, undefined, 0.2, 0.9, 0.2, 1, 'Clipes, rádio FM e megastores', 'Music videos, FM radio and megastores', 'Margens recordes e reedições de catálogo.', 'Record margins and catalog reissues.'),
  te('minidisc', 'MiniDisc', 'MiniDisc', undefined, 1992, 1998, 2005, 2013, 0.3, 0.1, 0.4, 1, 'Lojas de eletrônicos', 'Electronics stores', 'Formato elegante que o mercado ignora fora do Japão.', 'An elegant format the market ignores outside Japan.'),
  te('mp3_p2p', 'MP3 e P2P', 'MP3 & P2P', 'p2p', 1999, 2003, 2010, undefined, 0.85, 0.6, 0.7, 0.6, 'Fóruns, P2P e blogs', 'Forums, P2P and blogs', 'Tudo de graça; vendas físicas desabam.', 'Everything free; physical sales collapse.'),
  te('ipod', 'Tocador digital e downloads', 'Digital player & downloads', 'download', 2001, 2008, 2014, undefined, 0.6, 0.45, 0.8, 0.5, 'Loja de downloads e blogs', 'Download store and blogs', 'Mil músicas no bolso; o álbum se desmancha em faixas.', 'A thousand songs in your pocket; the album unbundles.'),
  te('ringtones', 'Ringtones', 'Ringtones', undefined, 2002, 2006, 2010, 2014, 0.3, 0.4, 1, 0.5, 'Operadoras de celular', 'Mobile carriers', 'Trechos de 30 segundos rendem mais que o single.', '30-second clips outearn the single.'),
  te('streaming', 'Streaming', 'Streaming', 'streaming', 2008, 2025, 2036, undefined, 0.15, 0.1, 0.8, 0.4, 'Playlists editoriais e algoritmos', 'Editorial playlists and algorithms', 'Acesso infinito; frações de centavo por play.', 'Infinite access; fractions of a cent per play.'),
  te('short_video', 'Vídeo curto', 'Short-form video', 'short_video', 2018, 2026, 2036, undefined, 0.2, 0.08, 0.95, 0.4, 'Trends de 15 segundos', '15-second trends', 'O refrão vira dança; músicas encurtam.', 'The hook becomes a dance; songs get shorter.'),
  te('synthetic_voices', 'Vozes sintéticas', 'Synthetic voices', 'synthetic_voice', 2030, 2035, 2040, undefined, 0.4, 0.05, 0.9, 0.2, 'Mercados de vozes e feeds', 'Voice markets and feeds', 'Qualquer timbre por assinatura; autoria em disputa.', 'Any timbre by subscription; authorship in dispute.'),
  te('neural_interface', 'Interface neural', 'Neural interface', 'neural', 2036, 2040, 2045, undefined, 0.3, 0.03, 0.6, 0.3, 'Feed neural personalizado', 'Personalized neural feed', 'Música sob medida para o cérebro de cada ouvinte.', 'Music tailored to each listener\'s brain.'),
];

// =====================================================================================
// PARADAS por gênero e região
// =====================================================================================
export type ChartScope = 'singles' | 'albums' | 'genre' | 'regional' | 'airplay' | 'streaming' | 'viral' | 'catalog' | 'neural' | 'sheet_music' | 'jukebox';

export interface ChartDef {
  id: string;
  name: string;
  realRef?: string;
  scope: ChartScope;
  market: MarketId | 'global';
  families?: FamilyId[];
  start: number;
  end?: number;
  size: number;
}

const ch = (id: string, name: string, realRef: string | undefined, scope: ChartScope, market: ChartDef['market'], start: number, size: number, families?: FamilyId[], end?: number): ChartDef =>
  ({ id, name, realRef, scope, market, start, size, families, end });

export const CHARTS: ChartDef[] = [
  ch('ws100', 'WorldSound 100', 'Billboard Hot 100', 'singles', 'global', 1958, 100),
  ch('ws_albums', 'WorldSound Albums', 'Billboard 200', 'albums', 'global', 1956, 200),
  ch('ws_sheet', 'WorldSound Partituras', 'Billboard sheet-music charts', 'sheet_music', 'na', 1920, 30, undefined, 1958),
  ch('ws_juke', 'WorldSound Jukebox', 'Most Played in Jukeboxes', 'jukebox', 'na', 1944, 30, undefined, 1958),
  ch('ws_race', 'WorldSound R&B', 'Billboard Hot R&B/Hip-Hop Songs', 'genre', 'na', 1942, 50, ['rnb', 'hiphop']),
  ch('ws_country', 'WorldSound Country', 'Billboard Hot Country Songs', 'genre', 'na', 1944, 50, ['country_folk']),
  ch('ws_rock', 'WorldSound Rock & Alternativo', 'Billboard Alternative Airplay / Mainstream Rock', 'genre', 'na', 1981, 40, ['rock']),
  ch('ws_rap', 'WorldSound Rap', 'Billboard Hot Rap Songs', 'genre', 'na', 1989, 25, ['hiphop']),
  ch('ws_dance', 'WorldSound Dance/Eletrônica', 'Billboard Dance Club Songs', 'genre', 'global', 1976, 50, ['electronic']),
  ch('ws_latin', 'WorldSound Latin', 'Billboard Hot Latin Songs', 'genre', 'latam', 1986, 50, ['latin', 'caribbean']),
  ch('ws_jazz', 'WorldSound Jazz', 'Billboard Jazz Albums', 'genre', 'global', 1967, 25, ['blues_jazz']),
  ch('ws_gospel', 'WorldSound Gospel', 'Billboard Gospel Songs', 'genre', 'na', 1974, 25, ['sacred']),
  ch('ws_airplay', 'WorldSound Rádio', 'Billboard Radio Songs', 'airplay', 'global', 1990, 50),
  ch('ws_stream', 'WorldSound Streaming', 'Billboard Streaming Songs', 'streaming', 'global', 2013, 50),
  ch('ws_viral', 'Loopit Viral 50', 'TikTok Viral / Spotify Viral 50', 'viral', 'global', 2018, 50),
  ch('ws_catalog', 'WorldSound Catálogo', 'Billboard Catalog Albums', 'catalog', 'global', 1991, 50),
  ch('uk_official', 'Parada Oficial Britânica', 'UK Singles Chart (Official Charts)', 'regional', 'eu', 1952, 40),
  ch('eu_hot', 'Euro Top 100', 'European Hot 100 Singles', 'regional', 'eu', 1984, 100),
  ch('br_parada', 'Parada Brasil', 'Crowley / Pro-Música Brasil / Billboard Brasil', 'regional', 'br', 1965, 50, ['brazil', 'pop', 'latin']),
  ch('latam_top', 'Top Latino', 'Monitor Latino', 'regional', 'latam', 1990, 50),
  ch('jp_oricon', 'Parada Hoshi', 'Oricon', 'regional', 'asia', 1968, 50, ['asia_me', 'pop']),
  ch('kr_gaon', 'Parada Hanbit', 'Gaon / Circle Chart', 'regional', 'asia', 2010, 100, ['pop', 'asia_me']),
  ch('in_filmi', 'Parada Filmi', 'Binaca Geetmala', 'regional', 'asia', 1952, 16, ['asia_me'], 1994),
  ch('af_top', 'Afro Top 50', 'Billboard U.S. Afrobeats / TurnTable Top 100', 'regional', 'africa', 2020, 50, ['africa']),
  ch('oc_top', 'Parada Cruzeiro do Sul', 'ARIA Charts', 'regional', 'oceania', 1983, 50),
  ch('neural_top', 'Cortex 100', undefined, 'neural', 'global', 2036, 100),
];

// Índices
export const platformById = Object.fromEntries(PLATFORMS.map((x) => [x.id, x])) as Record<string, PlatformDef>;
export const outletById = Object.fromEntries(OUTLETS.map((x) => [x.id, x])) as Record<string, OutletDef>;
export const criticById = Object.fromEntries(CRITICS.map((x) => [x.id, x])) as Record<string, CriticDef>;
export const producerById = Object.fromEntries(PRODUCERS.map((x) => [x.id, x])) as Record<string, ProducerDef>;
export const brandById = Object.fromEntries(BRANDS.map((x) => [x.id, x])) as Record<string, BrandDef>;
export const awardById = Object.fromEntries(AWARDS.map((x) => [x.id, x])) as Record<string, AwardDef>;
export const movementById = Object.fromEntries(MOVEMENTS.map((x) => [x.id, x])) as Record<string, MovementDef>;
export const geoById = Object.fromEntries(GEOPOLITICS.map((x) => [x.id, x])) as Record<string, GeoEvent>;
export const techEraById = Object.fromEntries(TECH_ERAS.map((x) => [x.id, x])) as Record<string, TechEraDef>;
export const chartById = Object.fromEntries(CHARTS.map((x) => [x.id, x])) as Record<string, ChartDef>;

/** Eventos geopolíticos ativos num ano e mercado. */
export function geoActive(year: number, market?: MarketId): GeoEvent[] {
  return GEOPOLITICS.filter((g) => g.from <= year && g.to >= year && (!market || g.markets.includes(market)));
}

/** Censura combinada (máxima) num mercado/ano. */
export function censorshipIn(year: number, market: MarketId): { level: number; banned: CensorTag[] } {
  let level = 0;
  const banned = new Set<CensorTag>();
  for (const g of geoActive(year, market)) {
    level = Math.max(level, g.effects.censorshipLevel);
    for (const t of g.effects.bannedTags) banned.add(t);
  }
  return { level, banned: [...banned] };
}

/** Plataformas ativas num ano (por launch/close). */
export function platformsIn(year: number): PlatformDef[] {
  return PLATFORMS.filter((p) => p.launch <= year && (p.close === undefined || p.close >= year));
}

/** Produtores em atividade num ano. */
export function producersIn(year: number): ProducerDef[] {
  return PRODUCERS.filter((p) => p.start <= year && p.end >= year);
}

/** Críticos em atividade num ano. */
export function criticsIn(year: number): CriticDef[] {
  return CRITICS.filter((c) => c.start <= year && c.end >= year);
}
