// Rodada 18 (regions18): a antiga "Ásia e Oriente Médio" aberta em seis submercados com dados por época.
// Fontes: IFPI/RIAJ/KMCA (tamanhos aproximados), histórias de Oricon, Melon, LINE Music, KKBox, QQ Music, JioSaavn, Anghami.
import { l } from '../world';
import type { Sub18 } from './types';

export const ASIA18: Sub18[] = [
  {
    id: 'jp', mk: 'asia', name: l('Japão', 'Japan'), a3: ['JPN'], hub: 'tokyo', entry: 1.4,
    share: [[1920, 0.45], [1960, 0.55], [1990, 0.62], [2010, 0.45], [2025, 0.3], [2040, 0.25]],
    pp: [[1920, 0.2], [1960, 0.35], [1990, 1.1], [2020, 0.75], [2040, 0.7]], langs: ['ja'],
    taste: [[1920, { asia_me: 2.2, europe: 0.7, blues_jazz: 0.8 }], [1950, { enka: 2.6, kayokyoku: 2.4, asia_me: 2, blues_jazz: 0.9, pop: 1.2 }],
      [1965, { rock: 1.1, pop: 1.4, enka: 2.4, asia_me: 1.9 }], [1985, { city_pop: 2.4, jpop: 2.4, pop: 1.5, enka: 2, rock: 1.1, asia_me: 1.8 }],
      [2005, { jpop: 2.6, anison: 2.4, kpop: 1.2, pop: 1.4, enka: 1.3, rock: 1.1, asia_me: 1.7, hiphop: 0.6 }], [2020, { jpop: 2.4, anison: 2.6, kpop: 1.6, vocaloid_pop: 1.8, pop: 1.3, enka: 1, asia_me: 1.6 }]],
    plats: [
      { name: 'Kōhaku Uta Gassen (NHK)', alt: l('Festival de Ano-Novo da TV estatal', 'State-TV New Year festival'), from: 1951, kind: 'tv', boost: 0.06, note: l('O especial de 31 de dezembro: ser convidado é a coroação do ano.', 'The 31 December special: an invitation crowns the year.') },
      { name: 'Oricon', alt: l('Parada oficial de vendas', 'Official sales chart'), from: 1968, kind: 'chart', boost: 0.03, note: l('Conta só unidades físicas — o pacote com ingresso de aperto de mão vira posição.', 'Counts physical units only — bundles with handshake tickets turn into chart positions.') },
      { name: 'Music Station (TV Asahi)', alt: l('Estação Musical (TV)', 'Music Station (TV)'), from: 1986, kind: 'tv', boost: 0.05, note: l('Vitrine semanal ao vivo.', 'Weekly live showcase.') },
      { name: 'Tower Records Shibuya', alt: l('Megaloja de Shibuya', 'Shibuya megastore'), from: 1981, kind: 'store', boost: 0.03, note: l('O Japão compra CD até muito depois do resto do mundo.', 'Japan keeps buying CDs long after everyone else.') },
      { name: 'Chaku-uta (ringtones)', alt: l('Toques de celular', 'Mobile ringtones'), from: 2002, to: 2012, kind: 'mobile', boost: 0.05, note: l('O celular vendia trechos de música antes do iTunes.', 'Phones sold song clips before iTunes did.') },
      { name: 'LINE Music', alt: l('Streaming do mensageiro', 'Messenger streaming'), from: 2015, kind: 'stream', boost: 0.05, note: l('Streaming atrasado: o Japão adotou devagar.', 'Late streaming: Japan adopted slowly.') },
    ],
    partners: [
      { name: 'Nippon Columbia', alt: l('Columbia japonesa', 'Japanese Columbia'), from: 1920, to: 1970, adv: 15000, note: l('Distribui enka e kayokyoku.', 'Distributes enka and kayokyoku.') },
      { name: 'Pony Canyon', alt: l('Grupo de mídia de Tóquio', 'Tokyo media group'), from: 1966, adv: 30000, note: l('Ligada à TV Fuji: aparição garantida.', 'Tied to Fuji TV: airtime included.') },
      { name: 'Avex', alt: l('Selo dance de Tóquio', 'Tokyo dance label'), from: 1988, adv: 45000, note: l('Distribui K-pop no Japão (BoA, TVXQ).', 'Distributes K-pop in Japan (BoA, TVXQ).') },
    ],
    bars: [
      { id: 'jp_visa', kind: 'visa', from: 1920, foreign: true, mult: 0.92, name: l('Visto de artista (Japão)', 'Artist visa (Japan)'), why: l('Turnê exige convite de promotor local e papelada demorada.', 'Touring needs a local promoter sponsor and slow paperwork.') },
    ],
    note: l('Segundo maior mercado do mundo por décadas; fiel ao CD e a quem aparece na TV.', 'The world\'s second-largest market for decades; loyal to CDs and to whoever is on TV.'),
  },
  {
    id: 'kr', mk: 'asia', name: l('Coreia do Sul', 'South Korea'), a3: ['KOR'], hub: 'seoul', entry: 0.9,
    share: [[1920, 0.03], [1970, 0.04], [1995, 0.07], [2010, 0.08], [2025, 0.1], [2040, 0.11]],
    pp: [[1920, 0.04], [1960, 0.05], [1990, 0.3], [2020, 0.6], [2040, 0.65]], langs: ['ko'],
    taste: [[1920, { trot: 2.4, asia_me: 2 }], [1970, { trot: 2.3, asia_me: 1.8, rock: 0.9, pop: 1.1 }], [1996, { kpop: 2.6, pop: 1.6, trot: 1.6, hiphop: 1, asia_me: 1.3 }],
      [2012, { kpop: 2.8, k_indie: 1.6, hiphop: 1.4, pop: 1.8, trot: 1.3, asia_me: 1.1 }]],
    plats: [
      { name: 'KBS Gayo Top 10', alt: l('Parada da TV pública', 'Public-TV chart show'), from: 1981, to: 1998, kind: 'tv', boost: 0.04, note: l('A parada na TV decide o ano.', 'The TV chart decides the year.') },
      { name: 'Music Bank / Inkigayo / M Countdown', alt: l('Programas semanais de música', 'Weekly music shows'), from: 1998, kind: 'tv', boost: 0.07, note: l('Vitória semanal por voto de fã, vendas e execução.', 'Weekly win by fan vote, sales and plays.') },
      { name: 'Melon', alt: l('Streaming líder coreano', 'Leading Korean streamer'), from: 2004, kind: 'stream', boost: 0.06, note: l('O "perfect all-kill": 1º em todas as paradas digitais.', 'The "perfect all-kill": #1 on every digital chart.') },
      { name: 'Hanteo', alt: l('Contagem de álbuns físicos', 'Physical album tracker'), from: 1993, kind: 'chart', boost: 0.03, note: l('Contagem da primeira semana: fandom compra em lote.', 'First-week tally: fandoms bulk-buy.') },
    ],
    partners: [
      { name: 'Oasis Records', alt: l('Selo veterano de Seul', 'Veteran Seoul label'), from: 1952, to: 1995, adv: 5000, note: l('Trot e pop dos anos 60-80.', 'Trot and pop of the 60s-80s.') },
      { name: 'CJ E&M', alt: l('Conglomerado de mídia', 'Media conglomerate'), from: 1995, adv: 25000, note: l('Dono da Mnet e de programas de sobrevivência.', 'Owns Mnet and survival shows.') },
      { name: 'Kakao M (LOEN)', alt: l('Dono do streaming líder', 'Owner of the leading streamer'), from: 2004, adv: 30000, note: l('Distribui e controla a vitrine do Melon.', 'Distributes and controls the Melon front page.') },
    ],
    bars: [
      { id: 'kr_japan_ban', kind: 'ban', from: 1948, to: 1998, hit: ['jpop', 'city_pop', 'enka', 'kayokyoku', 'anison'], mult: 0.3, name: l('Proibição da cultura japonesa', 'Japanese culture ban'), why: l('Até a abertura gradual de 1998-2004, discos japoneses eram proibidos.', 'Until the gradual opening of 1998-2004, Japanese records were banned.') },
      { id: 'kr_censor', kind: 'censor', from: 1972, to: 1987, hit: ['rock', 'rnb'], mult: 0.6, name: l('Censura do regime Yushin', 'Yushin-era censorship'), why: l('Em 1975, centenas de canções "decadentes" foram vetadas; roqueiros presos por maconha.', 'In 1975 hundreds of "decadent" songs were banned; rockers jailed over marijuana.') },
    ],
    note: l('Pequeno em dinheiro, gigante em influência: TV, fandom e streaming próprio.', 'Small in money, huge in influence: TV, fandom and its own streamers.'),
  },
  {
    id: 'cn', mk: 'asia', name: l('Grande China', 'Greater China'), a3: ['CHN', 'HKG', 'TWN', 'MAC'], hub: 'shanghai', entry: 1.6,
    share: [[1920, 0.12], [1950, 0.06], [1980, 0.07], [2000, 0.1], [2015, 0.18], [2030, 0.28], [2040, 0.3]],
    pp: [[1920, 0.03], [1960, 0.02], [1990, 0.04], [2020, 0.2], [2040, 0.3]], langs: ['zh'],
    taste: [[1920, { shidaiqu: 2.4, asia_me: 2.1, blues_jazz: 0.8 }], [1950, { asia_me: 2 }], [1975, { cantopop: 2.4, mandopop: 2.3, asia_me: 2, pop: 1.1 }],
      [1995, { mandopop: 2.5, cantopop: 2.1, pop: 1.4, kpop: 0.9, rock: 0.9, asia_me: 1.8 }], [2015, { mandopop: 2.4, pop: 1.5, kpop: 1.4, hiphop: 1, electronic: 1.1, asia_me: 1.7 }]],
    plats: [
      { name: 'Rádio Comercial de Hong Kong', alt: l('Rádio comercial de Hong Kong', 'Hong Kong commercial radio'), from: 1959, kind: 'radio', boost: 0.04, note: l('Hong Kong e Taiwan são a porta do pop chinês.', 'Hong Kong and Taiwan are the door to Chinese pop.') },
      { name: 'KKBox', alt: l('Streaming de Taiwan', 'Taiwanese streamer'), from: 2005, kind: 'stream', boost: 0.04, note: l('Mandopop de Taiwan para a diáspora.', 'Taiwanese Mandopop for the diaspora.') },
      { name: 'QQ Music / Kugou (Tencent)', alt: l('Streaming do mensageiro chinês', 'Chinese messenger streaming'), from: 2005, kind: 'stream', boost: 0.06, note: l('Antes de 2015, quase tudo era download pirata; depois a Tencent licenciou tudo.', 'Before 2015 nearly everything was pirated; then Tencent licensed it all.') },
      { name: 'Douyin', alt: l('Vídeo curto chinês', 'Chinese short video'), from: 2016, kind: 'mobile', boost: 0.06, note: l('15 segundos fazem um hit nacional.', 'Fifteen seconds make a national hit.') },
    ],
    partners: [
      { name: 'Pathé-EMI (Xangai)', alt: l('Gravadora de Xangai', 'Shanghai record company'), from: 1920, to: 1949, adv: 8000, note: l('A Xangai dos cabarés e do shidaiqu.', 'The Shanghai of cabarets and shidaiqu.') },
      { name: 'Rock Records (Taiwan)', alt: l('Selo de Taipei', 'Taipei label'), from: 1980, adv: 15000, note: l('Porta de Taiwan e Hong Kong.', 'Gateway to Taiwan and Hong Kong.') },
      { name: 'Tencent Music', alt: l('Gigante digital chinês', 'Chinese digital giant'), from: 2016, adv: 60000, note: l('Licença exclusiva: tudo passa por ela.', 'Exclusive licence: everything goes through it.') },
    ],
    bars: [
      { id: 'cn_closed', kind: 'approval', from: 1949, to: 1978, foreign: true, mult: 0.2, name: l('Mercado fechado (China continental)', 'Closed market (mainland China)'), why: l('Só Hong Kong e Taiwan compram música estrangeira.', 'Only Hong Kong and Taiwan buy foreign music.') },
      { id: 'cn_approval', kind: 'approval', from: 1979, foreign: true, mult: 0.85, name: l('Aprovação do Ministério da Cultura', 'Ministry of Culture approval'), why: l('Letras e capas estrangeiras passam por censor; um parceiro local acelera.', 'Foreign lyrics and covers go through a censor; a local partner speeds it up.') },
      { id: 'cn_piracy', kind: 'piracy', from: 1985, to: 2015, mult: 0.75, name: l('Pirataria massiva', 'Mass piracy'), why: l('Mais de 90% das cópias eram piratas até a lei de 2015.', 'Over 90% of copies were pirated until the 2015 crackdown.') },
      { id: 'cn_hiphop', kind: 'censor', from: 2018, hit: ['hiphop'], mult: 0.55, name: l('Veto ao hip hop na TV (2018)', 'Hip-hop TV ban (2018)'), why: l('O órgão regulador proibiu rappers tatuados na televisão.', 'The regulator banned tattooed rappers from TV.') },
      { id: 'cn_hallyu', kind: 'ban', from: 2016, to: 2023, hit: ['kpop', 'k_indie', 'k_synth'], mult: 0.45, name: l('Veto à Onda Coreana (THAAD)', 'Korean Wave ban (THAAD)'), why: l('Represália não oficial ao escudo antimísseis: shows coreanos cancelados.', 'Unofficial retaliation over the missile shield: Korean shows cancelled.') },
    ],
    note: l('Hoje o 2º/3º maior streaming do mundo, mas só se entra pela porta oficial.', 'Now a top-3 streaming market, but only through the official door.'),
  },
  {
    id: 'sea', mk: 'asia', name: l('Sudeste Asiático', 'Southeast Asia'), a3: ['IDN', 'PHL', 'THA', 'VNM', 'MYS', 'SGP', 'MMR', 'KHM', 'LAO', 'BRN'], hub: 'jakarta', entry: 0.8,
    share: [[1920, 0.12], [1970, 0.1], [1995, 0.1], [2015, 0.13], [2040, 0.16]],
    pp: [[1920, 0.03], [1960, 0.04], [1990, 0.06], [2020, 0.12], [2040, 0.16]], langs: ['id', 'tl', 'th', 'vi', 'ms', 'en'],
    taste: [[1920, { kroncong: 2.2, kundiman: 2, asia_me: 2 }], [1960, { asia_me: 2, pop: 1.3, rock: 0.9, rnb: 0.9 }], [1975, { dangdut: 2.4, opm: 2.2, luk_thung: 2.2, asia_me: 2, pop: 1.4 }],
      [2010, { kpop: 1.9, pop: 1.6, dangdut: 2, opm: 1.9, rnb: 1.1, asia_me: 1.7 }]],
    plats: [
      { name: 'Joox', alt: l('Streaming regional gratuito', 'Free regional streamer'), from: 2015, kind: 'stream', boost: 0.05, note: l('Grátis com anúncios: ouvintes em massa, pouco dinheiro.', 'Free with ads: mass listeners, little money.') },
      { name: 'MTV Asia', alt: l('Canal musical regional', 'Regional music channel'), from: 1991, to: 2010, kind: 'tv', boost: 0.04, note: l('Clipe em inglês com VJ local.', 'English clips with local VJs.') },
      { name: 'Videoke / karaokê', alt: l('Karaokê de bairro', 'Neighbourhood karaoke'), from: 1980, kind: 'store', boost: 0.03, note: l('Balada que se canta vira clássico eterno nas Filipinas.', 'A singable ballad becomes an eternal classic in the Philippines.') },
    ],
    partners: [
      { name: 'Musica Studio\'s', alt: l('Selo de Jacarta', 'Jakarta label'), from: 1966, adv: 8000, note: l('Indonésia: maior país da região.', 'Indonesia: the region\'s biggest country.') },
      { name: 'Star Music / Viva', alt: l('Selo de Manila', 'Manila label'), from: 1981, adv: 8000, note: l('Rede de TV filipina por trás.', 'A Filipino TV network behind it.') },
    ],
    bars: [
      { id: 'sea_piracy', kind: 'piracy', from: 1975, to: 2012, mult: 0.85, name: l('Fitas e CDs piratas', 'Pirate tapes and CDs'), why: l('Banca de rua vende a fita pelo preço do almoço.', 'Street stalls sell tapes for the price of lunch.') },
    ],
    note: l('Fragmentado em idiomas; o K-pop une a região a partir de 2010.', 'Split by language; K-pop unites the region after 2010.'),
  },
  {
    id: 'in', mk: 'asia', name: l('Índia e Sul da Ásia', 'India & South Asia'), a3: ['IND', 'PAK', 'BGD', 'LKA', 'NPL'], hub: 'mumbai', entry: 0.9,
    share: [[1920, 0.12], [1960, 0.1], [1985, 0.1], [2010, 0.12], [2040, 0.14]],
    pp: [[1920, 0.03], [1960, 0.02], [1990, 0.02], [2020, 0.07], [2040, 0.13]], langs: ['hi', 'ur', 'bn', 'en'],
    taste: [[1920, { indian_classical: 2.4, ghazal_pop: 2, asia_me: 2.2 }], [1940, { bollywood: 2.8, ghazal_pop: 2.1, indian_classical: 2, asia_me: 2.2 }],
      [1985, { bollywood: 2.9, bhangra: 2, qawwali_fusion: 1.8, asia_me: 2.2, pop: 0.9 }], [2010, { bollywood: 2.8, bhangra: 1.8, hiphop: 1, pop: 1.1, kpop: 0.8, asia_me: 2.1 }]],
    plats: [
      { name: 'Radio Ceylon — Binaca Geetmala', alt: l('Parada de rádio de Colombo', 'Colombo radio countdown'), from: 1952, to: 1994, kind: 'radio', boost: 0.06, note: l('A rádio estatal indiana proibiu música de filme; o país ouvia a parada do Ceilão.', 'Indian state radio banned film songs; the country tuned to Ceylon\'s countdown.') },
      { name: 'Doordarshan — Chitrahaar', alt: l('Clipes na TV estatal', 'State-TV song clips'), from: 1982, to: 2000, kind: 'tv', boost: 0.04, note: l('Meia hora de canções de filme por semana.', 'Half an hour of film songs a week.') },
      { name: 'JioSaavn / Gaana', alt: l('Streaming indiano', 'Indian streamers'), from: 2010, kind: 'stream', boost: 0.06, note: l('Dados móveis baratíssimos (Jio, 2016) põem 300 milhões no streaming.', 'Dirt-cheap mobile data (Jio, 2016) puts 300 million on streaming.') },
      { name: 'YouTube (T-Series)', alt: l('Canal de vídeo das trilhas', 'Soundtrack video channel'), from: 2010, kind: 'mobile', boost: 0.05, note: l('O maior canal do mundo é de uma gravadora de trilha.', 'The world\'s biggest channel belongs to a soundtrack label.') },
    ],
    partners: [
      { name: 'HMV / Saregama', alt: l('Gravadora colonial de Calcutá', 'Calcutta colonial label'), from: 1920, adv: 6000, note: l('Monopólio das trilhas até os anos 80.', 'Soundtrack monopoly until the 80s.') },
      { name: 'T-Series', alt: l('Gigante das fitas de Délhi', 'Delhi cassette giant'), from: 1983, adv: 12000, note: l('Fitas baratas (e covers) quebraram o monopólio.', 'Cheap tapes (and covers) broke the monopoly.') },
    ],
    bars: [
      { id: 'in_film', kind: 'quota', from: 1940, hit: ['pop', 'rock', 'rnb', 'hiphop', 'electronic', 'country_folk', 'blues_jazz', 'europe'], mult: 0.8, name: l('Domínio do cinema', 'Film dominance'), why: l('Mais de 70% das vendas são trilhas de filme; música avulsa estrangeira é nicho.', 'Over 70% of sales are film soundtracks; standalone foreign music is niche.') },
      { id: 'in_piracy', kind: 'piracy', from: 1980, to: 2010, mult: 0.85, name: l('Fitas copiadas', 'Copied tapes'), why: l('A própria T-Series começou com covers legais no limite.', 'T-Series itself began with borderline-legal covers.') },
    ],
    note: l('Ouvintes sem fim, centavos por ouvinte; quem manda é o filme.', 'Endless listeners, cents per listener; the film is king.'),
  },
  {
    id: 'mena', mk: 'asia', name: l('Oriente Médio', 'Middle East'), a3: ['TUR', 'IRN', 'IRQ', 'SAU', 'ARE', 'ISR', 'LBN', 'SYR', 'JOR', 'KWT', 'QAT', 'OMN', 'YEM', 'BHR', 'PSE', 'AFG', 'KAZ', 'UZB'], hub: 'beirut', entry: 1.1,
    share: [[1920, 0.1], [1960, 0.08], [1990, 0.07], [2015, 0.08], [2040, 0.08]],
    pp: [[1920, 0.05], [1960, 0.06], [1990, 0.15], [2020, 0.3], [2040, 0.35]], langs: ['ar', 'tr', 'fa', 'he'],
    taste: [[1920, { arabic_classical: 2.6, asia_me: 2.2 }], [1960, { arabic_pop: 2.5, arabic_classical: 2.2, khaleeji: 2, persian_pop: 2, asia_me: 2.2 }],
      [1975, { arabesk: 2.4, arabic_pop: 2.4, mizrahi: 1.9, persian_pop: 1.8, asia_me: 2.1, pop: 1 }], [2010, { arabic_pop: 2.3, khaleeji: 2.2, pop: 1.3, hiphop: 1, electronic: 1, asia_me: 2 }]],
    plats: [
      { name: 'Rotana', alt: l('Conglomerado do Golfo', 'Gulf conglomerate'), from: 1987, kind: 'tv', boost: 0.06, note: l('Selo, canal de TV e rádio de um príncipe saudita.', 'A Saudi prince\'s label, TV channel and radio.') },
      { name: 'Anghami', alt: l('Streaming árabe', 'Arab streamer'), from: 2012, kind: 'stream', boost: 0.05, note: l('Streaming de Beirute para o mundo árabe.', 'Streaming from Beirut for the Arab world.') },
      { name: 'Fitas de casamento e sermão', alt: l('Circuito da fita cassete', 'Cassette circuit'), from: 1975, to: 2000, kind: 'store', boost: 0.03, note: l('Do Cairo a Istambul, a fita leva o arabesk.', 'From Cairo to Istanbul, tapes carry arabesk.') },
    ],
    partners: [
      { name: 'Relax-In (Beirute)', alt: l('Distribuidora de Beirute', 'Beirut distributor'), from: 1960, to: 1990, adv: 6000, note: l('Beirute era a capital pop árabe.', 'Beirut was the Arab pop capital.') },
      { name: 'Rotana Records', alt: l('Selo do Golfo', 'Gulf label'), from: 1987, adv: 25000, note: l('Controla o catálogo árabe e a TV.', 'Controls the Arab catalogue and TV.') },
    ],
    bars: [
      { id: 'me_morals', kind: 'censor', from: 1979, hit: ['hiphop', 'rnb'], mult: 0.75, name: l('Censura moral (Golfo e Irã)', 'Moral censorship (Gulf & Iran)'), why: l('Letras e clipes passam por aprovação; no Irã a música pop ficou proibida até 1997.', 'Lyrics and clips need approval; in Iran pop was banned until 1997.') },
      { id: 'me_visa', kind: 'visa', from: 1990, foreign: true, mult: 0.88, name: l('Vistos e seguro de turnê', 'Visas and tour insurance'), why: l('Guerras e regras de entrada encarecem e cancelam datas.', 'Wars and entry rules raise costs and cancel dates.') },
    ],
    note: l('Ricos no Golfo, gigantes em ouvintes no Egito e na Turquia; rádio e TV pan-árabes decidem.', 'Rich in the Gulf, huge in listeners in Egypt and Turkey; pan-Arab TV and radio decide.'),
  },
];
