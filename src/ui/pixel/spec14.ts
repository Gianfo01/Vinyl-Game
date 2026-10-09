// Rodada 14 — especificação pura das cenas ilustradas (sem DOM): que local, qual era, que equipamento
// e moda aparecem, tamanho da plateia e pontos clicáveis. scenes14.ts desenha a partir disto.

import { l, type L } from '../../data/world';
import type { PlaceKind } from '../../sim/sys/scenes/state';
import { eraOf, type EraId } from './palette';

export type Scene14 = 'studio_control' | 'studio_live' | 'venue' | 'media' | 'store' | 'pressing' | 'home' | 'garage' | 'city' | 'awards' | 'press';

/** Para onde um clique leva: outra área (com aba opcional) ou trocar a cena no lugar. */
export type Nav14 = { area: string; tab?: [string, string] } | { swap: Scene14 };

export interface Hotspot14 {
  id: string;
  /** retângulo em pixels da arte (256×144) */
  x: number; y: number; w: number; h: number;
  label: L;
  tip: L;
  to?: Nav14;
}

export interface SceneOpts14 {
  year: number;
  /** público do show (casa de show) */
  attendance?: number;
  /** capacidade da casa (para a lotação) */
  capacity?: number;
  cityId?: string;
  variant?: number;
}

export interface SceneSpec14 {
  kind: Scene14;
  era: EraId;
  /** local do motor antigo reaproveitado; null = desenhado em rooms14 */
  place: PlaceKind | null;
  title: L;
  /** equipamento/decoração da época */
  gear: L;
  /** moda da época (as pessoas da cena se vestem assim) */
  fashion: L;
  /** porte da casa (0 bar … 4 estádio), só em 'venue' */
  tier: number;
  /** 0..1: fração da plateia desenhada */
  fill: number;
  hotspots: Hotspot14[];
}

const FASHION: Record<EraId, L> = {
  '1920': l('Chapéus, ternos de três peças e vestidos melindrosa', 'Hats, three-piece suits and flapper dresses'),
  '1950': l('Topetes, jaquetas de couro e saias rodadas', 'Quiffs, leather jackets and swing skirts'),
  '1960': l('Franjas, boca de sino e cabelos compridos', 'Fringe, bell-bottoms and long hair'),
  '1980': l('Ombreiras, neon e cabelos armados', 'Shoulder pads, neon and big hair'),
  '1990': l('Flanela, jeans largo e bonés', 'Flannel, baggy jeans and caps'),
  '2000': l('Jeans de cintura baixa, bonés e fones brancos', 'Low-rise jeans, caps and white earbuds'),
  '2010': l('Skinny, barba e tênis de corrida', 'Skinny jeans, beards and runners'),
  '2020': l('Roupas largas, tênis grossos e fone sem fio', 'Oversized fits, chunky sneakers and wireless buds'),
  '2030': l('Tecidos inteligentes e acessórios luminosos', 'Smart fabrics and glowing accessories'),
};

const STUDIO_GEAR: Record<EraId, L> = {
  '1920': l('Torno de corte direto na cera e um único microfone de carbono', 'Direct-to-wax cutting lathe and a single carbon mic'),
  '1950': l('Mesa valvulada e gravador de fita mono', 'Tube desk and mono tape recorder'),
  '1960': l('Mesa grande e fita multipista (4 a 24 canais)', 'Big desk and multitrack tape (4 to 24 tracks)'),
  '1980': l('Mesa automatizada, reverb digital e bateria eletrônica', 'Automated desk, digital reverb and drum machine'),
  '1990': l('Fita digital, racks de efeitos e as primeiras DAWs', 'Digital tape, effects racks and the first DAWs'),
  '2000': l('DAW com plugins: a mesa vira tela', 'DAW with plugins: the desk becomes a screen'),
  '2010': l('Laptop, controlador MIDI e home studio', 'Laptop, MIDI controller and home studio'),
  '2020': l('DAW na nuvem e ferramentas de IA na mixagem', 'Cloud DAW and AI mixing tools'),
  '2030': l('Console holográfico e vozes neurais', 'Holographic console and neural voices'),
};

const HOME_GEAR: Record<EraId, L> = {
  '1920': l('Gramofone de manivela e piano da sala', 'Crank gramophone and parlour piano'),
  '1950': l('Rádio de válvula e toca-discos portátil', 'Tube radio and portable record player'),
  '1960': l('Som três-em-um e pôsteres psicodélicos', 'Hi-fi stack and psychedelic posters'),
  '1980': l('Boombox, fitas cassete e teclado', 'Boombox, cassettes and a keyboard'),
  '1990': l('Discman, CDs e gravador de 4 canais', 'Discman, CDs and a 4-track recorder'),
  '2000': l('PC com programa de gravação e MP3', 'PC with recording software and MP3s'),
  '2010': l('Laptop, interface USB e celular', 'Laptop, USB interface and smartphone'),
  '2020': l('Ring light, celular no tripé e microfone USB', 'Ring light, phone on a tripod and USB mic'),
  '2030': l('Óculos de realidade mista e estúdio de bolso', 'Mixed-reality glasses and a pocket studio'),
};

/** Mídia da época: rádio AM → TV P&B → auditório → canal de clipes → talk show → curadoria → live. */
export function mediaPlace14(year: number): PlaceKind {
  return year < 1950 ? 'radio_am' : year < 1962 ? 'tv_variety' : year < 1981 ? 'tv_auditorium' : year < 2000 ? 'tv_clips' : year < 2010 ? 'tv_talk' : year < 2022 ? 'curators' : 'livestream';
}

const MEDIA_TITLE: Partial<Record<PlaceKind, L>> = {
  radio_am: l('Estação de rádio AM', 'AM radio station'),
  tv_variety: l('Estúdio de TV preto e branco', 'Black-and-white TV studio'),
  tv_auditorium: l('Programa de auditório', 'Studio-audience show'),
  tv_clips: l('Set do canal de clipes', 'Music video channel set'),
  tv_talk: l('Talk show', 'Talk show'),
  curators: l('Escritório de playlists do streaming', 'Streaming playlist office'),
  livestream: l('Estúdio de live', 'Livestream studio'),
};

const MEDIA_GEAR: Partial<Record<PlaceKind, L>> = {
  radio_am: l('Microfone de fita e transmissor valvulado', 'Ribbon mic and tube transmitter'),
  tv_variety: l('Câmeras enormes e orquestra ao vivo', 'Huge cameras and a live orchestra'),
  tv_auditorium: l('Plateia, jurados e apresentador carismático', 'Audience, judges and a charismatic host'),
  tv_clips: l('VJ, telões e a parada de clipes', 'VJ, video walls and the video chart'),
  tv_talk: l('Sofá, banda da casa e entrevista', 'Couch, house band and interview'),
  curators: l('Painéis de dados e curadores de playlist', 'Data dashboards and playlist curators'),
  livestream: l('Câmera, chat ao vivo e algoritmo', 'Camera, live chat and the algorithm'),
};

/** Porte da casa a partir do público (respeita o ano: arena só depois de 1975, estádio depois de 1965). */
export function venueTier14(attendance: number, year: number): number {
  let t = attendance < 300 ? 0 : attendance < 1500 ? 1 : attendance < 5000 ? 2 : attendance < 20000 ? 3 : 4;
  if (t === 4 && year < 1965) t = 3;
  if (t === 3 && year < 1950) t = 2;
  return t;
}

const VENUE_PLACE: PlaceKind[] = ['venue_bar', 'venue_club', 'venue_theatre', 'venue_arena', 'venue_stadium'];
const VENUE_TITLE: L[] = [l('Bar com palquinho', 'Bar with a tiny stage'), l('Clube de shows', 'Music club'), l('Teatro', 'Theatre'), l('Arena', 'Arena'), l('Estádio', 'Stadium')];
const CAP = [300, 1500, 5000, 20000, 80000];

/** Marcos de cidade que já existem no ano (a arte respeita a data de construção). */
export function landmarks14(cityId: string, year: number): string[] {
  const out: string[] = [];
  const add = (id: string, from = 0, to = 9999) => { if (year >= from && year < to) out.push(id); };
  switch (cityId) {
    case 'paris': add('eiffel'); break;
    case 'london': add('bigben'); add('eye', 2000); add('shard', 2012); break;
    case 'new_york': add('empire', 1931); add('twins', 1973, 2001); add('onewtc', 2014); break;
    case 'tokyo': add('tokyotower', 1958); add('skytree', 2012); break;
    case 'rio': add('sugarloaf'); add('christ', 1931); break;
    case 'berlin': add('tvtower', 1969); add('wall', 1961, 1990); break;
    case 'seattle': add('needle', 1962); break;
    case 'toronto': add('cntower', 1976); break;
    case 'sydney': add('bridge', 1932); add('opera', 1973); break;
    case 'seoul': add('namsan', 1975); break;
    case 'los_angeles': add('hollywood', 1923); add('palms'); break;
    case 'miami': case 'honolulu': add('palms'); break;
    case 'las_vegas': add('neonstrip', 1940); break;
    case 'cairo': add('pyramids'); break;
    case 'istanbul': case 'beirut': add('dome'); break;
    case 'brasilia': add('congress', 1960); break;
    case 'sao_paulo': add('copan', 1966); break;
    case 'hong_kong': add('harbour'); break;
    case 'havana': add('capitol', 1929); break;
  }
  return out;
}

const r = (id: string, x: number, y: number, w: number, hh: number, label: L, tip: L, to?: Nav14): Hotspot14 => ({ id, x, y, w, h: hh, label, tip, to });

const TO_SESSION: Nav14 = { area: 'studio', tab: ['creation-studio', 'session'] };
const TO_GEAR: Nav14 = { area: 'studio', tab: ['creation-studio', 'studio-gear'] };

/** Especificação da cena (função pura, testável). */
export function sceneSpec14(kind: Scene14, o: SceneOpts14): SceneSpec14 {
  const y = o.year;
  const era = eraOf(y);
  const base = { kind, era, fashion: FASHION[era], tier: 0, fill: 1 };
  const crowdTip = (what: L): L => l(`${what.pt} Moda da época: ${FASHION[era].pt.toLowerCase()}.`, `${what.en} Period fashion: ${FASHION[era].en.toLowerCase()}.`);
  switch (kind) {
    case 'studio_control': return { ...base, place: null, title: l('Estúdio — sala de controle', 'Studio — control room'), gear: STUDIO_GEAR[era], hotspots: [
      r('desk', 70, 92, 116, 30, y < 2000 ? l('Mesa de som', 'Mixing desk') : l('Estação de trabalho', 'Workstation'), STUDIO_GEAR[era], TO_SESSION),
      r('window', 64, 10, 128, 52, l('Vidro da sala de gravação', 'Live-room glass'), l('Clique para entrar na sala de gravação.', 'Click to step into the live room.'), { swap: 'studio_live' }),
      r('rack', 4, 60, 44, 60, y < 1950 ? l('Torno de corte', 'Cutting lathe') : y < 2000 ? l('Fita e racks', 'Tape and racks') : l('Monitores e periféricos', 'Monitors and outboard'), l('Equipamento do estúdio: melhorar muda o som e a nota técnica.', 'Studio gear: upgrading changes the sound and the technical score.'), TO_GEAR),
      r('couch', 200, 74, 52, 48, l('Sofá do produtor', 'Producer\'s couch'), l('Produtores e parceiros de estúdio.', 'Producers and studio partners.'), { area: 'studio12' }),
    ] };
    case 'studio_live': return { ...base, place: null, title: l('Estúdio — sala de gravação', 'Studio — live room'), gear: STUDIO_GEAR[era], hotspots: [
      r('booth', 88, 6, 80, 40, l('Vidro da técnica', 'Control-room glass'), l('Clique para voltar à sala de controle.', 'Click to go back to the control room.'), { swap: 'studio_control' }),
      r('mic', 112, 64, 32, 60, l('Microfone do vocal', 'Vocal mic'), l('Marque sessões para gravar as músicas.', 'Book sessions to record songs.'), TO_SESSION),
      r('drums', 20, 70, 64, 56, l('Bateria', 'Drum kit'), l('Músicos de estúdio e a banda.', 'Session players and the band.'), TO_SESSION),
      r('keys', 180, 66, 70, 56, y >= 1970 ? l('Sintetizadores', 'Synths') : l('Piano', 'Piano'), l('Instrumentos do estúdio: equipamento da época.', 'Studio instruments: period gear.'), TO_GEAR),
    ] };
    case 'venue': {
      const att = Math.max(0, o.attendance ?? 120);
      const tier = venueTier14(att, y);
      const cap = o.capacity && o.capacity > 0 ? o.capacity : CAP[tier];
      const fill = Math.max(0.12, Math.min(1, att / cap));
      return { ...base, place: tier === 3 && y < 1975 ? 'venue_gym' : VENUE_PLACE[tier], tier, fill, title: VENUE_TITLE[tier], gear: tier >= 3 ? (y >= 2000 ? l('Telões de LED, pirotecnia e line array', 'LED walls, pyro and line arrays') : l('Torres de som e canhões de luz', 'PA towers and follow spots')) : l('Amplificador no palco e luz simples', 'Backline amps and simple lights'), hotspots: [
        r('stage', 60, 30, 136, 56, l('Palco', 'Stage'), l('Rotas e turnês: agentes e promotores.', 'Routes and tours: agents and promoters.'), { area: 'tour12' }),
        r('crowd', 0, 96, 256, 48, l(`Público: ${Math.round(att)}`, `Crowd: ${Math.round(att)}`), crowdTip(l(`Lotação ${Math.round(fill * 100)}%.`, `${Math.round(fill * 100)}% full.`)), { area: 'shows' }),
      ] };
    }
    case 'media': {
      const pl = mediaPlace14(y);
      return { ...base, place: pl, title: MEDIA_TITLE[pl]!, gear: MEDIA_GEAR[pl]!, hotspots: [
        r('on_air', 70, 0, 116, 60, pl === 'radio_am' ? l('No ar', 'On air') : l('Câmeras e telões', 'Cameras and screens'), l('Canais, jabá e reputação na mídia.', 'Channels, payola and media reputation.'), { area: 'media', tab: ['mediaHub', 'channels'] }),
        r('guests', 60, 84, 140, 50, l('Convidados', 'Guests'), crowdTip(l('Entrevistas e resenhas.', 'Interviews and reviews.')), { area: 'media', tab: ['mediaHub', 'press'] }),
        r('chart', 196, 4, 60, 70, l('Paradas', 'Charts'), l('O que toca hoje vira parada amanhã.', 'What plays today charts tomorrow.'), { area: 'charts' }),
      ] };
    }
    case 'store': return { ...base, place: 'store', title: l('Loja de discos', 'Record store'), gear: y < 1950 ? l('Discos de 78 rpm e cabines de audição', '78 rpm records and listening booths') : y < 1985 ? l('LPs, compactos e cabines de audição', 'LPs, singles and listening booths') : y < 2005 ? l('CDs na prateleira e vitrine de lançamentos', 'CDs on the racks and a new-release window') : l('Vinil de colecionador e QR para o streaming', 'Collector vinyl and streaming QR codes'), hotspots: [
      r('window', 136, 12, 52, 50, l('Vitrine de lançamentos', 'New-release window'), l('Lançar e planejar o rollout.', 'Release and plan the rollout.'), { area: 'releases', tab: ['creation-release', 'launch'] }),
      r('shelves', 4, 12, 64, 64, l('Prateleiras', 'Racks'), l('Seu catálogo e o fundo de catálogo.', 'Your catalog and back catalog.'), { area: 'catalog' }),
      r('fans', 116, 100, 140, 44, l('Fila de autógrafos', 'Signing line'), crowdTip(l('Fãs dos seus artistas.', 'Fans of your acts.')), { area: 'artists' }),
    ] };
    case 'pressing': return { ...base, place: 'factory', title: l('Fábrica de discos', 'Pressing plant'), gear: y < 1948 ? l('Prensas de goma-laca para 78 rpm', 'Shellac presses for 78s') : y < 1983 ? l('Prensas de vinil e forno de PVC', 'Vinyl presses and PVC oven') : y < 2008 ? l('Linha de CD ao lado das prensas', 'CD line next to the presses') : l('Prensagem sob demanda para colecionadores', 'On-demand pressing for collectors'), hotspots: [
      r('presses', 60, 50, 140, 50, l('Prensas', 'Presses'), l('Tiragem e lançamento.', 'Pressing run and release.'), { area: 'releases', tab: ['creation-release', 'launch'] }),
      r('qc', 70, 104, 116, 30, l('Controle de qualidade', 'Quality control'), l('Fabricação e custos da empresa.', 'Manufacturing and company costs.'), { area: 'business' }),
    ] };
    case 'home': case 'garage': {
      const g = kind === 'garage';
      return { ...base, place: null, title: g ? l('Garagem de ensaio', 'Rehearsal garage') : l('Casa do artista', 'Artist\'s home'), gear: HOME_GEAR[era], hotspots: [
        r('instruments', g ? 20 : 150, 60, g ? 120 : 96, 64, l('Instrumentos', 'Instruments'), l('Compor e ensaiar repertório.', 'Write and rehearse songs.'), { area: 'creation' }),
        r('stereo', g ? 180 : 10, g ? 50 : 56, 70, 50, l('Aparelho de som', 'Stereo'), HOME_GEAR[era], { area: 'creation', tab: ['creation-write', 'cr-themes'] }),
        r('door', g ? 150 : 90, 8, 60, 40, g ? l('Portão', 'Garage door') : l('Janela', 'Window'), l('A vida fora da música.', 'Life outside music.'), { area: 'personal' }),
      ] };
    }
    case 'city': {
      const lm = landmarks14(o.cityId ?? '', y);
      return { ...base, place: null, title: l('Cidade', 'City'), gear: lm.length ? l(`Marcos: ${lm.length}`, `Landmarks: ${lm.length}`) : l('Prédios, letreiros e trânsito da época', 'Period buildings, signs and traffic'), hotspots: [
        r('skyline', 0, 0, 256, 60, l('Horizonte', 'Skyline'), l('Mapa, mercados e cenas locais.', 'Map, markets and local scenes.'), { area: 'world' }),
        r('venue', 6, 62, 84, 56, l('Casa de shows', 'Music venue'), l('Shows e turnês nesta cidade.', 'Shows and tours in this city.'), { area: 'shows' }),
        r('store', 92, 62, 72, 56, l('Loja de discos', 'Record store'), l('Vendas e catálogo.', 'Sales and catalog.'), { area: 'catalog' }),
        r('radio', 166, 40, 88, 78, y < 1950 ? l('Rádio', 'Radio station') : y < 2010 ? l('Rádio e TV', 'Radio and TV') : l('Escritório do streaming', 'Streaming office'), l('Mídia local.', 'Local media.'), { area: 'media', tab: ['mediaHub', 'channels'] }),
        r('street', 0, 118, 256, 26, l('Rua', 'Street'), crowdTip(l('Gente da cidade.', 'City folk.')), { area: 'market' }),
      ] };
    }
    case 'awards': return { ...base, place: 'awards', title: l('Cerimônia de premiação', 'Awards ceremony'), gear: y < 1959 ? l('Banquete de gala e rádio ao vivo', 'Gala dinner and live radio') : y < 2005 ? l('Transmissão na TV e tapete vermelho', 'TV broadcast and red carpet') : l('Transmissão online e telões', 'Online stream and video walls'), hotspots: [
      r('podium', 90, 30, 76, 60, l('Palco do prêmio', 'Award stage'), l('Premiações, indicações e campanhas.', 'Ceremonies, nominations and campaigns.'), { area: 'awards' }),
      r('tables', 0, 92, 256, 52, l('Convidados', 'Guests'), crowdTip(l('A indústria inteira olhando.', 'The whole industry watching.')), { area: 'labels' }),
    ] };
    case 'press': return { ...base, place: null, title: l('Coletiva de imprensa', 'Press conference'), gear: y < 1950 ? l('Bloquinhos, flashes de magnésio e um microfone', 'Notepads, magnesium flashes and one mic') : y < 1990 ? l('Câmeras de TV e um buquê de microfones', 'TV cameras and a bouquet of mics') : y < 2010 ? l('Painel de logos e flashes digitais', 'Logo backdrop and digital flashes') : l('Celulares erguidos e transmissão ao vivo', 'Raised phones and live streaming'), hotspots: [
      r('podium', 88, 40, 80, 60, l('Púlpito', 'Podium'), l('Imprensa e crítica.', 'Press and critics.'), { area: 'media', tab: ['mediaHub', 'press'] }),
      r('reporters', 0, 100, 256, 44, l('Repórteres', 'Reporters'), crowdTip(l('Cada resposta vira manchete.', 'Every answer becomes a headline.')), { area: 'media', tab: ['mediaHub', 'press'] }),
    ] };
  }
}

/** Cena que ilustra uma decisão/evento pela categoria. */
export function sceneOfCat14(cat: string): Scene14 {
  const m: Record<string, Scene14> = { scandal: 'press', culture: 'city', health: 'home', contract: 'press', career: 'studio_control', world: 'city', stage: 'venue', people: 'home', business: 'press', band: 'garage', scouting: 'venue', market: 'store', manufacturing: 'pressing', tech: 'media', neural: 'studio_control' };
  return m[cat] ?? 'city';
}
