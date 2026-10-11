// Rodada 19 (world19) — marcos da cidade-sede no horizonte do "Nosso mundo". Cada marco tem ano de construção
// (e de demolição/destruição quando houve): nada aparece antes de existir e some depois. Fatos curtos e
// documentados; desenho genérico (silhueta), sem marcas. Cidades sem entrada usam silhuetas genéricas da região.

import { l, type L } from './world';

export type LmShape = 'statue' | 'bridge' | 'tbridge' | 'arch' | 'spire' | 'twin' | 'clock' | 'lattice' | 'needle' | 'shell' | 'stadium' | 'dome' | 'hall'
  | 'cathedral' | 'wall' | 'cable' | 'pyramid' | 'minaret' | 'pagoda' | 'sign' | 'gate' | 'colosseum' | 'castle' | 'wheel' | 'obelisk' | 'temple' | 'studio';
/** music: 'venue' = casa histórica (prestígio para suas casas na cidade); 'studio' = estúdio lendário; 'stadium' = shows em estádio */
export interface Landmark19 { id: string; city: string; n: L; from: number; to?: number; sh: LmShape; fact: L; music?: 'venue' | 'studio' | 'stadium' }

const m = (id: string, city: string, pt: string, en: string, from: number, sh: LmShape, fpt: string, fen: string, extra: Partial<Landmark19> = {}): Landmark19 =>
  ({ id, city, n: l(pt, en), from, sh, fact: l(fpt, fen), ...extra });

export const LANDMARKS19: Landmark19[] = [
  // Brasil
  m('rio_cable', 'rio', 'Bondinho do Pão de Açúcar', 'Sugarloaf cable car', 1912, 'cable', 'O primeiro trecho do bondinho abriu em 1912.', 'The first leg of the cable car opened in 1912.'),
  m('rio_christ', 'rio', 'Cristo Redentor', 'Christ the Redeemer', 1931, 'statue', 'Inaugurado em 1931 no alto do Corcovado.', 'Inaugurated in 1931 on top of Corcovado.'),
  m('rio_maracana', 'rio', 'Maracanã', 'Maracanã stadium', 1950, 'stadium', 'Aberto em 1950 para a Copa do Mundo; recebeu grandes shows de estádio.', 'Opened in 1950 for the World Cup; it later hosted big stadium concerts.', { music: 'stadium' }),
  m('sp_municipal', 'sao_paulo', 'Theatro Municipal', 'Municipal Theatre', 1911, 'hall', 'Inaugurado em 1911; palco da Semana de Arte Moderna de 1922.', 'Opened in 1911; stage of the 1922 Modern Art Week.', { music: 'venue' }),
  m('sp_italia', 'sao_paulo', 'Edifício Itália', 'Edifício Itália', 1965, 'spire', 'Concluído em 1965, por décadas um dos mais altos da cidade.', 'Completed in 1965, for decades one of the city\'s tallest.'),
  m('ssa_lacerda', 'salvador', 'Elevador Lacerda', 'Lacerda Elevator', 1873, 'spire', 'Liga a Cidade Baixa à Cidade Alta desde 1873.', 'Has linked the Lower and Upper City since 1873.'),
  m('bsb_congress', 'brasilia', 'Congresso Nacional', 'National Congress', 1960, 'twin', 'Inaugurado com a cidade, em 1960.', 'Opened with the city, in 1960.'),
  // América do Norte
  m('ny_brooklyn', 'new_york', 'Ponte do Brooklyn', 'Brooklyn Bridge', 1883, 'bridge', 'Aberta em 1883.', 'Opened in 1883.'),
  m('ny_liberty', 'new_york', 'Estátua da Liberdade', 'Statue of Liberty', 1886, 'statue', 'Inaugurada em 1886.', 'Dedicated in 1886.'),
  m('ny_carnegie', 'new_york', 'Carnegie Hall', 'Carnegie Hall', 1891, 'hall', 'Sala de concertos aberta em 1891.', 'Concert hall opened in 1891.', { music: 'venue' }),
  m('ny_apollo', 'new_york', 'Teatro Apollo (Harlem)', 'Apollo Theater (Harlem)', 1934, 'hall', 'Virou o Apollo em 1934; suas noites de amadores lançaram muitos artistas.', 'Became the Apollo in 1934; its amateur nights launched many artists.', { music: 'venue' }),
  m('ny_empire', 'new_york', 'Empire State', 'Empire State Building', 1931, 'spire', 'Concluído em 1931.', 'Completed in 1931.'),
  m('ny_wtc', 'new_york', 'Torres Gêmeas', 'Twin Towers', 1973, 'twin', 'Inauguradas em 1973; destruídas em 11 de setembro de 2001.', 'Opened in 1973; destroyed on 11 September 2001.', { to: 2001 }),
  m('la_sign', 'los_angeles', 'Letreiro nas colinas', 'Hillside sign', 1923, 'sign', 'Erguido em 1923 nas colinas de Hollywood.', 'Put up in 1923 in the Hollywood Hills.'),
  m('la_bowl', 'los_angeles', 'Hollywood Bowl', 'Hollywood Bowl', 1922, 'shell', 'Anfiteatro aberto em 1922.', 'Amphitheatre opened in 1922.', { music: 'venue' }),
  m('la_griffith', 'los_angeles', 'Observatório Griffith', 'Griffith Observatory', 1935, 'dome', 'Aberto em 1935.', 'Opened in 1935.'),
  m('nash_ryman', 'nashville', 'Ryman Auditorium', 'Ryman Auditorium', 1892, 'hall', 'Aberto em 1892; casa do Grand Ole Opry de 1943 a 1974.', 'Opened in 1892; home of the Grand Ole Opry from 1943 to 1974.', { music: 'venue' }),
  m('nash_opry', 'nashville', 'Grand Ole Opry House', 'Grand Ole Opry House', 1974, 'hall', 'O Opry se mudou para cá em 1974.', 'The Opry moved here in 1974.', { music: 'venue' }),
  m('mem_sun', 'memphis', 'Sun Studio', 'Sun Studio', 1950, 'studio', 'Aberto em 1950 como Memphis Recording Service.', 'Opened in 1950 as the Memphis Recording Service.', { music: 'studio' }),
  m('mem_bridge', 'memphis', 'Ponte Hernando de Soto', 'Hernando de Soto Bridge', 1973, 'arch', 'Atravessa o Mississippi desde 1973.', 'Has crossed the Mississippi since 1973.'),
  m('nola_cathedral', 'new_orleans', 'Catedral de São Luís', 'St. Louis Cathedral', 1794, 'cathedral', 'O prédio atual é de 1794 (reformado em 1850).', 'The current building dates from 1794 (rebuilt in 1850).'),
  m('nola_preservation', 'new_orleans', 'Preservation Hall', 'Preservation Hall', 1961, 'hall', 'Casa de jazz tradicional aberta em 1961.', 'Traditional jazz house opened in 1961.', { music: 'venue' }),
  m('nola_dome', 'new_orleans', 'Superdome', 'Superdome', 1975, 'dome', 'Aberto em 1975.', 'Opened in 1975.', { music: 'stadium' }),
  m('det_hitsville', 'detroit', 'Hitsville U.S.A.', 'Hitsville U.S.A.', 1959, 'studio', 'Casa-estúdio comprada em 1959, berço do som de Detroit.', 'House-studio bought in 1959, cradle of the Detroit sound.', { music: 'studio' }),
  m('det_ambassador', 'detroit', 'Ponte Ambassador', 'Ambassador Bridge', 1929, 'bridge', 'Aberta em 1929, liga Detroit ao Canadá.', 'Opened in 1929, linking Detroit to Canada.'),
  m('chi_chess', 'chicago', 'Estúdio da Chess (2120 S. Michigan)', 'Chess studio (2120 S. Michigan)', 1957, 'studio', 'A gravadora ocupou o prédio de 1957 a 1965.', 'The label used the building from 1957 to 1965.', { to: 1966, music: 'studio' }),
  m('chi_sears', 'chicago', 'Torre Sears', 'Sears Tower', 1973, 'spire', 'Concluída em 1973.', 'Completed in 1973.'),
  m('sea_needle', 'seattle', 'Space Needle', 'Space Needle', 1962, 'needle', 'Construída para a Feira Mundial de 1962.', 'Built for the 1962 World\'s Fair.'),
  m('sf_gate', 'san_francisco', 'Golden Gate', 'Golden Gate Bridge', 1937, 'bridge', 'Aberta em 1937.', 'Opened in 1937.'),
  m('sf_fillmore', 'san_francisco', 'Fillmore', 'The Fillmore', 1965, 'hall', 'Os shows de rock começaram ali em dezembro de 1965.', 'Rock shows began there in December 1965.', { music: 'venue' }),
  m('tor_cn', 'toronto', 'CN Tower', 'CN Tower', 1976, 'needle', 'Aberta em 1976.', 'Opened in 1976.'),
  m('tor_massey', 'toronto', 'Massey Hall', 'Massey Hall', 1894, 'hall', 'Sala de concertos aberta em 1894.', 'Concert hall opened in 1894.', { music: 'venue' }),
  m('was_monument', 'washington', 'Monumento a Washington', 'Washington Monument', 1884, 'obelisk', 'Concluído em 1884.', 'Completed in 1884.'),
  m('was_capitol', 'washington', 'Capitólio', 'Capitol', 1800, 'dome', 'Em uso desde 1800; a cúpula atual é de 1866.', 'In use since 1800; the current dome dates from 1866.'),
  m('bos_symphony', 'boston', 'Symphony Hall', 'Symphony Hall', 1900, 'hall', 'Aberto em 1900.', 'Opened in 1900.', { music: 'venue' }),
  m('lv_strat', 'las_vegas', 'Torre Stratosphere', 'Stratosphere Tower', 1996, 'needle', 'Aberta em 1996.', 'Opened in 1996.'),
  // América Latina
  m('ba_colon', 'buenos_aires', 'Teatro Colón', 'Teatro Colón', 1908, 'hall', 'Inaugurado em 1908.', 'Opened in 1908.', { music: 'venue' }),
  m('ba_obelisk', 'buenos_aires', 'Obelisco', 'Obelisk', 1936, 'obelisk', 'Erguido em 1936.', 'Built in 1936.'),
  m('mx_bellas', 'mexico_city', 'Palácio de Belas Artes', 'Palace of Fine Arts', 1934, 'dome', 'Inaugurado em 1934.', 'Opened in 1934.', { music: 'venue' }),
  m('mx_latino', 'mexico_city', 'Torre Latino-americana', 'Torre Latinoamericana', 1956, 'spire', 'Concluída em 1956.', 'Completed in 1956.'),
  m('hav_capitolio', 'havana', 'Capitólio', 'Capitolio', 1929, 'dome', 'Concluído em 1929.', 'Completed in 1929.'),
  m('hav_tropicana', 'havana', 'Tropicana', 'Tropicana club', 1939, 'shell', 'Cabaré ao ar livre aberto em 1939.', 'Open-air cabaret opened in 1939.', { music: 'venue' }),
  m('kgn_studio1', 'kingston', 'Studio One', 'Studio One', 1963, 'studio', 'Estúdio aberto em 1963 na Brentford Road.', 'Studio opened in 1963 on Brentford Road.', { music: 'studio' }),
  // Europa
  m('lon_bigben', 'london', 'Big Ben', 'Big Ben', 1859, 'clock', 'O relógio da torre começou a funcionar em 1859.', 'The tower clock started in 1859.'),
  m('lon_rah', 'london', 'Royal Albert Hall', 'Royal Albert Hall', 1871, 'dome', 'Aberto em 1871.', 'Opened in 1871.', { music: 'venue' }),
  m('lon_tbridge', 'london', 'Tower Bridge', 'Tower Bridge', 1894, 'tbridge', 'Aberta em 1894.', 'Opened in 1894.'),
  m('lon_abbey', 'london', 'Estúdios de Abbey Road', 'Abbey Road Studios', 1931, 'studio', 'Abertos em 1931.', 'Opened in 1931.', { music: 'studio' }),
  m('lon_bt', 'london', 'Torre dos Correios', 'Post Office Tower', 1965, 'needle', 'Aberta em 1965.', 'Opened in 1965.'),
  m('lon_eye', 'london', 'Roda-gigante do Tâmisa', 'Thames Ferris wheel', 2000, 'wheel', 'Aberta ao público em 2000.', 'Opened to the public in 2000.'),
  m('liv_cavern', 'liverpool', 'Cavern Club', 'Cavern Club', 1957, 'hall', 'Porão aberto em 1957; o original fechou em 1973.', 'Cellar club opened in 1957; the original closed in 1973.', { to: 1973, music: 'venue' }),
  m('liv_liver', 'liverpool', 'Royal Liver Building', 'Royal Liver Building', 1911, 'clock', 'Concluído em 1911.', 'Completed in 1911.'),
  m('man_fth', 'manchester', 'Free Trade Hall', 'Free Trade Hall', 1856, 'hall', 'Aberto em 1856; sala de concertos até 1996.', 'Opened in 1856; a concert hall until 1996.', { to: 1997, music: 'venue' }),
  m('man_trafford', 'manchester', 'Old Trafford', 'Old Trafford', 1910, 'stadium', 'Estádio aberto em 1910.', 'Stadium opened in 1910.', { music: 'stadium' }),
  m('par_eiffel', 'paris', 'Torre Eiffel', 'Eiffel Tower', 1889, 'lattice', 'Construída para a Exposição Universal de 1889.', 'Built for the 1889 World\'s Fair.'),
  m('par_arc', 'paris', 'Arco do Triunfo', 'Arc de Triomphe', 1836, 'gate', 'Concluído em 1836.', 'Completed in 1836.'),
  m('par_olympia', 'paris', 'Olympia', 'Olympia music hall', 1893, 'hall', 'Music hall aberto em 1893.', 'Music hall opened in 1893.', { music: 'venue' }),
  m('ber_gate', 'berlin', 'Portão de Brandemburgo', 'Brandenburg Gate', 1791, 'gate', 'Concluído em 1791.', 'Completed in 1791.'),
  m('ber_wall', 'berlin', 'Muro de Berlim', 'Berlin Wall', 1961, 'wall', 'Erguido em 1961; caiu em novembro de 1989.', 'Built in 1961; fell in November 1989.', { to: 1990 }),
  m('ber_tv', 'berlin', 'Torre de TV', 'TV Tower', 1969, 'needle', 'Inaugurada em 1969.', 'Opened in 1969.'),
  m('sto_hall', 'stockholm', 'Prefeitura', 'City Hall', 1923, 'clock', 'Inaugurada em 1923.', 'Opened in 1923.'),
  m('mil_scala', 'milan', 'Teatro alla Scala', 'La Scala', 1778, 'hall', 'Inaugurado em 1778.', 'Opened in 1778.', { music: 'venue' }),
  m('mil_duomo', 'milan', 'Duomo', 'Milan Cathedral', 1800, 'cathedral', 'Obra de séculos; a fachada foi concluída no início do século XIX.', 'Built over centuries; the façade was finished in the early 19th century.'),
  m('dub_spire', 'dublin', 'The Spire', 'The Spire', 2003, 'needle', 'Erguida em 2003.', 'Erected in 2003.'),
  m('dub_bridge', 'dublin', 'Ponte Ha\'penny', 'Ha\'penny Bridge', 1816, 'arch', 'Aberta em 1816.', 'Opened in 1816.'),
  m('lis_belem', 'lisbon', 'Torre de Belém', 'Belém Tower', 1519, 'castle', 'Concluída em 1519.', 'Completed in 1519.'),
  m('lis_bridge', 'lisbon', 'Ponte sobre o Tejo', 'Tagus suspension bridge', 1966, 'bridge', 'Aberta em 1966.', 'Opened in 1966.'),
  m('rom_colosseum', 'rome', 'Coliseu', 'Colosseum', 80, 'colosseum', 'Inaugurado no ano 80.', 'Inaugurated in AD 80.'),
  m('vie_musikverein', 'vienna', 'Musikverein', 'Musikverein', 1870, 'hall', 'Sala aberta em 1870.', 'Hall opened in 1870.', { music: 'venue' }),
  m('vie_wheel', 'vienna', 'Roda-gigante do Prater', 'Prater Ferris wheel', 1897, 'wheel', 'Construída em 1897.', 'Built in 1897.'),
  m('ams_concert', 'amsterdam', 'Concertgebouw', 'Concertgebouw', 1888, 'hall', 'Aberto em 1888.', 'Opened in 1888.', { music: 'venue' }),
  m('bcn_palau', 'barcelona', 'Palau de la Música', 'Palau de la Música', 1908, 'hall', 'Inaugurado em 1908.', 'Opened in 1908.', { music: 'venue' }),
  m('bcn_sagrada', 'barcelona', 'Sagrada Família', 'Sagrada Família', 1882, 'cathedral', 'Obra iniciada em 1882 e ainda em construção por décadas.', 'Begun in 1882 and under construction for decades.'),
  m('mad_alcala', 'madrid', 'Porta de Alcalá', 'Puerta de Alcalá', 1778, 'gate', 'Concluída em 1778.', 'Completed in 1778.'),
  m('pra_bridge', 'prague', 'Ponte Carlos', 'Charles Bridge', 1402, 'tbridge', 'Concluída por volta de 1402.', 'Completed around 1402.'),
  m('bud_parl', 'budapest', 'Parlamento', 'Parliament', 1904, 'dome', 'Concluído em 1904.', 'Completed in 1904.'),
  m('ath_parthenon', 'athens', 'Partenon', 'Parthenon', -432, 'temple', 'Concluído no século V a.C.', 'Completed in the 5th century BC.'),
  m('mos_basil', 'moscow', 'Catedral de São Basílio', 'St Basil\'s Cathedral', 1561, 'minaret', 'Concluída em 1561.', 'Completed in 1561.'),
  m('mos_ostankino', 'moscow', 'Torre Ostankino', 'Ostankino Tower', 1967, 'needle', 'Concluída em 1967.', 'Completed in 1967.'),
  // Ásia, África, Oceania
  m('tok_tower', 'tokyo', 'Torre de Tóquio', 'Tokyo Tower', 1958, 'lattice', 'Concluída em 1958.', 'Completed in 1958.'),
  m('tok_budokan', 'tokyo', 'Budokan', 'Budokan', 1964, 'pagoda', 'Arena aberta em 1964; virou palco de shows de rock.', 'Arena opened in 1964; it became a rock concert stage.', { music: 'venue' }),
  m('tok_sky', 'tokyo', 'Tokyo Skytree', 'Tokyo Skytree', 2012, 'needle', 'Aberta em 2012.', 'Opened in 2012.'),
  m('seo_tower', 'seoul', 'Torre de Seul', 'Seoul Tower', 1971, 'needle', 'Concluída em 1971.', 'Completed in 1971.'),
  m('mum_gate', 'mumbai', 'Portal da Índia', 'Gateway of India', 1924, 'gate', 'Concluído em 1924.', 'Completed in 1924.'),
  m('hk_boc', 'hong_kong', 'Torre do Bank of China', 'Bank of China Tower', 1990, 'spire', 'Concluída em 1990.', 'Completed in 1990.'),
  m('bkk_arun', 'bangkok', 'Wat Arun', 'Wat Arun', 1850, 'pagoda', 'O prang central ganhou a forma atual no século XIX.', 'The central prang took its present form in the 19th century.'),
  m('ist_hagia', 'istanbul', 'Santa Sofia', 'Hagia Sophia', 537, 'minaret', 'Concluída em 537.', 'Completed in 537.'),
  m('ist_bridge', 'istanbul', 'Ponte do Bósforo', 'Bosphorus Bridge', 1973, 'bridge', 'Aberta em 1973.', 'Opened in 1973.'),
  m('cai_pyramids', 'cairo', 'Pirâmides de Gizé', 'Pyramids of Giza', -2560, 'pyramid', 'Erguidas há mais de 4.500 anos.', 'Built more than 4,500 years ago.'),
  m('cai_tower', 'cairo', 'Torre do Cairo', 'Cairo Tower', 1961, 'needle', 'Concluída em 1961.', 'Completed in 1961.'),
  m('jhb_hillbrow', 'johannesburg', 'Torre de Hillbrow', 'Hillbrow Tower', 1971, 'needle', 'Concluída em 1971.', 'Completed in 1971.'),
  m('syd_bridge', 'sydney', 'Harbour Bridge', 'Harbour Bridge', 1932, 'arch', 'Aberta em 1932.', 'Opened in 1932.'),
  m('syd_opera', 'sydney', 'Opera House', 'Opera House', 1973, 'shell', 'Inaugurada em 1973.', 'Opened in 1973.', { music: 'venue' }),
  m('mel_flinders', 'melbourne', 'Estação Flinders Street', 'Flinders Street Station', 1910, 'clock', 'Prédio concluído em 1910.', 'Building completed in 1910.'),
  m('mel_mcg', 'melbourne', 'MCG', 'Melbourne Cricket Ground', 1853, 'stadium', 'Em uso desde 1853.', 'In use since 1853.', { music: 'stadium' }),
];

/** Silhuetas genéricas (cidades sem entrada): igreja antiga, ponte, torre de TV, estádio — pela época. */
const GEN: { sh: LmShape; from: number; n: L }[] = [
  { sh: 'cathedral', from: 0, n: l('Catedral da cidade', 'City cathedral') },
  { sh: 'bridge', from: 1900, n: l('Ponte do rio', 'River bridge') },
  { sh: 'stadium', from: 1950, n: l('Estádio municipal', 'City stadium') },
  { sh: 'needle', from: 1970, n: l('Torre de TV', 'TV tower') },
];

/** Marcos de pé na cidade no ano (construídos e ainda não demolidos), no máximo 4, mais antigos primeiro. */
export function landmarksAt19(city: string, year: number): Landmark19[] {
  const own = LANDMARKS19.filter((x) => x.city === city);
  const src = own.length ? own : GEN.map((g, i) => ({ id: `gen_${i}`, city, n: g.n, from: g.from, sh: g.sh, fact: l('Silhueta genérica da cidade (sem marco cadastrado).', 'Generic city silhouette (no listed landmark).') } as Landmark19));
  return src.filter((x) => x.from <= year && (x.to === undefined || year < x.to)).sort((a, b) => a.from - b.from).slice(-4);
}
