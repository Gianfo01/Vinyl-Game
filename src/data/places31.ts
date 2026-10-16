// R31 · onda 4 (H · Loja e cidade) — LUGARES REAIS DA MÚSICA por cidade (rádios, TVs, casas de show, teatros, arenas,
// lojas, estúdios, gravadoras, terrenos fixos de festival e bares famosos). Cada lugar só existe entre `from` e `to`
// (to = 0: ainda funciona) e vira um prédio no mapa da cidade, num terreno reservado (src/sim/r31/city31.ts), com o papel
// do seu tipo no jogo (rádio do mercado de rádio, casa de shows onde se marca data, estúdio onde se grava…).
//
// Níveis: capitais da música (~20 cidades, 12–20 lugares), cidades médias (~50, 3–6) e as demais (1–3). Curadoria com
// a marca `v` (verificar) quando a data ou a existência tem dúvida. Os nomes reais ficam AQUI e no registro único
// (src/data/realnames31.ts, espaço `place:` — gerado por scripts/r31/gen-places31.ts); com "Nomes e obras reais"
// desligado o jogo mostra a homenagem. Flags: `v` verificar · `u` interior único · `lm:<id>` mesmo lugar de um marco
// de src/data/landmarks19.ts (o marco sai do horizonte quando o prédio está no mapa).

export type RKind31 = 'radio' | 'tv' | 'venue' | 'theatre' | 'arena' | 'store' | 'studio' | 'label' | 'fest' | 'bar';
export const RKINDS31: RKind31[] = ['radio', 'tv', 'venue', 'theatre', 'arena', 'store', 'studio', 'label', 'fest', 'bar'];

export interface RealPlace31 {
  id: string; city: string; kind: RKind31;
  /** ano de abertura; `to` = ano em que já não existe (0 = ainda funciona) */
  from: number; to: number;
  real: string; sub: string;
  /** verificar datas/existência */ v?: boolean;
  /** interior único */ u?: boolean;
  /** marco equivalente em landmarks19 */ lm?: string;
}

const P = (id: string, city: string, kind: RKind31, from: number, to: number, real: string, sub: string, flags = ''): RealPlace31 => {
  const f = flags.split(/\s+/).filter(Boolean);
  const lm = f.find((x) => x.startsWith('lm:'));
  return { id, city, kind, from, to, real, sub, ...(f.includes('v') ? { v: true } : {}), ...(f.includes('u') ? { u: true } : {}), ...(lm ? { lm: lm.slice(3) } : {}) };
};

/** Capitais da música (nível 1). As cidades médias (nível 2) e as demais (nível 3) saem da contagem. */
export const CAPITALS31 = ['sao_paulo', 'rio', 'salvador', 'new_york', 'los_angeles', 'nashville', 'new_orleans', 'memphis', 'detroit', 'chicago',
  'london', 'liverpool', 'manchester', 'paris', 'berlin', 'tokyo', 'kingston', 'havana', 'buenos_aires', 'mexico_city'];
export const MEDIUM31 = ['recife', 'bh', 'seattle', 'bogota', 'stockholm', 'milan', 'dublin', 'lisbon', 'seoul', 'mumbai', 'hong_kong', 'bangkok', 'beirut',
  'istanbul', 'lagos', 'johannesburg', 'cairo', 'dakar', 'sydney', 'melbourne', 'porto_alegre', 'curitiba', 'belem', 'fortaleza', 'brasilia', 'goiania',
  'austin', 'atlanta', 'philadelphia', 'san_francisco', 'miami', 'toronto', 'montreal', 'cleveland', 'boston', 'washington', 'las_vegas', 'madrid',
  'barcelona', 'rome', 'amsterdam', 'vienna', 'moscow', 'glasgow', 'bristol', 'birmingham', 'hamburg', 'osaka', 'santiago', 'lima', 'medellin', 'san_juan'];
export const tierOf31 = (city: string): 1 | 2 | 3 => (CAPITALS31.includes(city) ? 1 : MEDIUM31.includes(city) ? 2 : 3);

export const PLACES31: RealPlace31[] = [
// São Paulo
P('sp_gazeta_fm', 'sao_paulo', 'radio', 1976, 0, 'Gazeta FM', 'Rádio Folha FM', ''),
P('sp_tv_gazeta', 'sao_paulo', 'tv', 1970, 0, 'TV Gazeta', 'TV Folhetim', ''),
P('sp_galeria_rock', 'sao_paulo', 'store', 1963, 0, 'Galeria do Rock', 'Galeria do Roque', ''),
P('sp_municipal', 'sao_paulo', 'theatre', 1911, 0, 'Theatro Municipal', 'Theatro Paulistano', 'lm:sp_municipal'),
P('sp_89fm', 'sao_paulo', 'radio', 1985, 0, '89 FM', 'Rádio 98 Rock', 'v'),
P('sp_radio_record', 'sao_paulo', 'radio', 1928, 0, 'Rádio Record', 'Rádio Recorde', 'v'),
P('sp_tv_record', 'sao_paulo', 'tv', 1953, 0, 'TV Record', 'TV Recorde', ''),
P('sp_tv_tupi', 'sao_paulo', 'tv', 1950, 1980, 'TV Tupi', 'TV Tupinambá', ''),
P('sp_paramount', 'sao_paulo', 'theatre', 1929, 0, 'Teatro Paramount', 'Teatro Paramonte', 'v'),
P('sp_sala_sp', 'sao_paulo', 'theatre', 1999, 0, 'Sala São Paulo', 'Sala São Paulinho', ''),
P('sp_sesc_pompeia', 'sao_paulo', 'venue', 1982, 0, 'Sesc Pompeia', 'Sesc Pompeiana', 'v'),
P('sp_aeroanta', 'sao_paulo', 'venue', 1987, 1993, 'Aeroanta', 'Aeroformiga', 'v'),
P('sp_madame_sata', 'sao_paulo', 'bar', 1983, 0, 'Madame Satã', 'Madame Capeta', 'v'),
P('sp_baratos_afins', 'sao_paulo', 'store', 1978, 0, 'Baratos Afins', 'Baratos Afinados', 'v'),
P('sp_continental', 'sao_paulo', 'label', 1943, 1993, 'Gravadora Continental', 'Gravadora Continentinha', 'v'),
P('sp_morumbi', 'sao_paulo', 'arena', 1960, 0, 'Estádio do Morumbi', 'Estádio do Morumbá', ''),
P('sp_credicard_hall', 'sao_paulo', 'arena', 1999, 0, 'Credicard Hall', 'Crediquarto Hall', 'v'),
P('sp_allianz_parque', 'sao_paulo', 'arena', 2014, 0, 'Allianz Parque', 'Aliança Parque', ''),
P('sp_interlagos', 'sao_paulo', 'fest', 2014, 0, 'Autódromo de Interlagos (Lollapalooza)', 'Autódromo de Interlagoas', 'v'),
// Rio de Janeiro
P('rio_canecao', 'rio', 'venue', 1967, 2010, 'Canecão', 'Canequinha', 'u'),
P('rio_circo_voador', 'rio', 'venue', 1982, 0, 'Circo Voador', 'Circo Planador', ''),
P('rio_globo', 'rio', 'tv', 1965, 0, 'TV Globo (Jardim Botânico)', 'TV Esfera (Jardim Botânico)', ''),
P('rio_cidade_do_rock', 'rio', 'fest', 2011, 0, 'Cidade do Rock', 'Vila do Roque', ''),
P('rio_cidade_rock_85', 'rio', 'fest', 1985, 1986, 'Cidade do Rock (Jacarepaguá)', 'Vila do Roque (Jacarepaguá)', ''),
P('rio_casa_edison', 'rio', 'store', 1900, 1932, 'Casa Edison', 'Casa Edson', 'v'),
P('rio_radio_sociedade', 'rio', 'radio', 1923, 0, 'Rádio Sociedade (Rádio MEC)', 'Rádio Sociedadezinha', 'v'),
P('rio_mayrink_veiga', 'rio', 'radio', 1926, 1965, 'Rádio Mayrink Veiga', 'Rádio Mairinque Vega', 'v'),
P('rio_radio_nacional', 'rio', 'radio', 1936, 0, 'Rádio Nacional', 'Rádio Nacionalíssima', ''),
P('rio_tv_tupi', 'rio', 'tv', 1951, 1980, 'TV Tupi Rio', 'TV Tupinambá Rio', ''),
P('rio_municipal', 'rio', 'theatre', 1909, 0, 'Theatro Municipal do Rio de Janeiro', 'Theatro Carioca', ''),
P('rio_maracana', 'rio', 'arena', 1950, 0, 'Maracanã', 'Maracanãzinho de Ouro', 'lm:rio_maracana'),
P('rio_beco_garrafas', 'rio', 'bar', 1959, 1965, 'Beco das Garrafas', 'Beco dos Garrafões', 'v'),
P('rio_som_livre', 'rio', 'label', 1969, 0, 'Som Livre', 'Som Solto', 'v'),
P('rio_fundicao', 'rio', 'venue', 1982, 0, 'Fundição Progresso', 'Fundição Regresso', 'v'),
P('rio_metropolitan', 'rio', 'venue', 1994, 0, 'Metropolitan', 'Metropolitano', 'v'),
P('rio_vivo_rio', 'rio', 'venue', 2006, 0, 'Vivo Rio', 'Vivíssimo Rio', 'v'),
P('rio_jeunesse', 'rio', 'arena', 2007, 0, 'Jeunesse Arena', 'Juventude Arena', 'v'),
P('rio_scenarium', 'rio', 'bar', 2001, 0, 'Rio Scenarium', 'Rio Cenarium', 'v'),
// Salvador
P('ssa_radio_sociedade', 'salvador', 'radio', 1924, 0, 'Rádio Sociedade da Bahia', 'Rádio Sociedade Baiana', 'v'),
P('ssa_tv_itapoan', 'salvador', 'tv', 1960, 0, 'TV Itapoan', 'TV Itapuã', 'v'),
P('ssa_tv_bahia', 'salvador', 'tv', 1985, 0, 'TV Bahia', 'TV Baía', ''),
P('ssa_radio_educadora', 'salvador', 'radio', 1978, 0, 'Rádio Educadora FM', 'Rádio Educadinha FM', 'v'),
P('ssa_castro_alves', 'salvador', 'theatre', 1967, 0, 'Teatro Castro Alves', 'Teatro Castro Altos', ''),
P('ssa_concha', 'salvador', 'venue', 1986, 0, 'Concha Acústica do TCA', 'Concha Elétrica', 'v'),
P('ssa_vila_velha', 'salvador', 'theatre', 1964, 0, 'Teatro Vila Velha', 'Teatro Vila Nova', ''),
P('ssa_olodum', 'salvador', 'venue', 1979, 0, 'Casa do Olodum', 'Casa do Olotambor', 'v'),
P('ssa_ile_aiye', 'salvador', 'venue', 2003, 0, 'Senzala do Barro Preto (Ilê Aiyê)', 'Senzala do Barro Escuro', 'v'),
P('ssa_wr', 'salvador', 'studio', 1975, 2017, 'Estúdio WR', 'Estúdio WX', 'v'),
P('ssa_fonte_nova', 'salvador', 'arena', 1951, 0, 'Arena Fonte Nova', 'Arena Fonte Velha', 'v'),
P('ssa_parque_expo', 'salvador', 'fest', 1999, 0, 'Parque de Exposições (Festival de Verão)', 'Parque de Exibições', 'v'),
P('ssa_bahia_cafe_hall', 'salvador', 'venue', 1998, 2012, 'Bahia Café Hall', 'Baía Cafezinho Hall', 'v'),
// New York
P('ny_carnegie', 'new_york', 'theatre', 1891, 0, 'Carnegie Hall', 'Carnival Hall', 'lm:ny_carnegie'),
P('ny_cotton_club', 'new_york', 'venue', 1923, 1940, 'Cotton Club', 'Linen Club', 'v'),
P('ny_savoy', 'new_york', 'venue', 1926, 1958, 'Savoy Ballroom', 'Savvy Ballroom', ''),
P('ny_ed_sullivan', 'new_york', 'theatre', 1927, 0, 'Ed Sullivan Theater', 'Ed Sullenvan Theater', 'v'),
P('ny_brill', 'new_york', 'label', 1931, 0, 'Brill Building', 'Drill Building', ''),
P('ny_radio_city', 'new_york', 'theatre', 1932, 0, 'Radio City Music Hall', 'Radio Town Music Hall', ''),
P('ny_nbc', 'new_york', 'tv', 1933, 0, 'NBC Studios (30 Rockefeller Plaza)', 'NBS Studios (30 Rockafella Plaza)', 'v'),
P('ny_apollo', 'new_york', 'theatre', 1934, 0, 'Apollo Theater', 'Apolinho Theater', 'u lm:ny_apollo'),
P('ny_village_vanguard', 'new_york', 'bar', 1935, 0, 'Village Vanguard', 'Village Rearguard', ''),
P('ny_birdland', 'new_york', 'venue', 1949, 0, 'Birdland', 'Birdlândia', 'v'),
P('ny_columbia_30th', 'new_york', 'studio', 1949, 1982, 'Columbia 30th Street Studio', 'Colombo 31st Street Studio', 'v'),
P('ny_wabc', 'new_york', 'radio', 1953, 0, 'WABC', 'WABZ', 'v'),
P('ny_fillmore_east', 'new_york', 'venue', 1968, 1972, 'Fillmore East', 'Fullmore East', ''),
P('ny_msg', 'new_york', 'arena', 1968, 0, 'Madison Square Garden', 'Madison Circle Garden', ''),
P('ny_electric_lady', 'new_york', 'studio', 1970, 0, 'Electric Lady Studios', 'Eclectic Lady Studios', ''),
P('ny_cbgb', 'new_york', 'venue', 1973, 2007, 'CBGB', 'CBGF', 'u'),
P('ny_studio_54', 'new_york', 'venue', 1977, 1987, 'Studio 54', 'Studio 45', 'u v'),
P('ny_z100', 'new_york', 'radio', 1983, 0, 'Z100', 'Z99', ''),
P('ny_colony', 'new_york', 'store', 1948, 2012, 'Colony Records', 'Colônia Records', 'v'),
P('ny_bowery_ballroom', 'new_york', 'venue', 1998, 0, 'Bowery Ballroom', 'Bowling Ballroom', ''),
// Los Angeles
P('la_cocoanut_grove', 'los_angeles', 'bar', 1921, 1989, 'Cocoanut Grove', 'Pineapple Grove', 'v'),
P('la_khj', 'los_angeles', 'radio', 1922, 0, 'KHJ', 'KHZ', 'v'),
P('la_bowl', 'los_angeles', 'theatre', 1922, 0, 'Hollywood Bowl', 'Hollywood Bowlinho', 'lm:la_bowl'),
P('la_shrine', 'los_angeles', 'theatre', 1926, 0, 'Shrine Auditorium', 'Shine Auditorium', ''),
P('la_greek', 'los_angeles', 'theatre', 1930, 0, 'Greek Theatre', 'Geek Theatre', ''),
P('la_ciros', 'los_angeles', 'bar', 1940, 1957, 'Ciro\'s', 'Zero\'s', 'v'),
P('la_ktla', 'los_angeles', 'tv', 1947, 0, 'KTLA', 'KTLZ', ''),
P('la_gold_star', 'los_angeles', 'studio', 1950, 1984, 'Gold Star Studios', 'Silver Star Studios', 'v'),
P('la_capitol', 'los_angeles', 'label', 1956, 0, 'Capitol Records Tower', 'Capital Records Tower', ''),
P('la_troubadour', 'los_angeles', 'venue', 1957, 0, 'The Troubadour', 'The Trovador', ''),
P('la_sunset_sound', 'los_angeles', 'studio', 1962, 0, 'Sunset Sound', 'Sunrise Sound', ''),
P('la_whisky', 'los_angeles', 'venue', 1964, 0, 'Whisky a Go Go', 'Whiskey a No No', ''),
P('la_aandm', 'los_angeles', 'studio', 1966, 0, 'A&M Studios', 'B&N Studios', 'v'),
P('la_forum', 'los_angeles', 'arena', 1967, 0, 'The Forum', 'The Fórum Romano', ''),
P('la_tower_sunset', 'los_angeles', 'store', 1970, 2006, 'Tower Records (Sunset)', 'Torre Records (Sunset)', ''),
P('la_kroq', 'los_angeles', 'radio', 1972, 0, 'KROQ', 'KRAQ', 'v'),
P('la_roxy', 'los_angeles', 'venue', 1973, 0, 'The Roxy', 'The Foxy', ''),
P('la_staples', 'los_angeles', 'arena', 1999, 0, 'Staples Center (Crypto.com Arena)', 'Stapler Center', ''),
P('la_amoeba', 'los_angeles', 'store', 2001, 0, 'Amoeba Music', 'Ameba Music', 'v'),
P('la_disney_hall', 'los_angeles', 'theatre', 2003, 0, 'Walt Disney Concert Hall', 'Walt Dizzy Concert Hall', ''),
// Nashville
P('nash_ryman', 'nashville', 'theatre', 1892, 0, 'Ryman Auditorium', 'Rymer Auditorium', 'lm:nash_ryman'),
P('nash_wsm', 'nashville', 'radio', 1925, 0, 'WSM', 'WSN', ''),
P('nash_war_memorial', 'nashville', 'theatre', 1925, 0, 'War Memorial Auditorium', 'Peace Memorial Auditorium', 'v'),
P('nash_ernest_tubb', 'nashville', 'store', 1947, 2022, 'Ernest Tubb Record Shop', 'Earnest Tub Record Shop', 'v'),
P('nash_wsm_tv', 'nashville', 'tv', 1950, 0, 'WSM-TV (WSMV)', 'WSN-TV', 'v'),
P('nash_quonset', 'nashville', 'studio', 1955, 1982, 'Quonset Hut Studio', 'Quonset Tent Studio', 'v'),
P('nash_rca_b', 'nashville', 'studio', 1957, 1977, 'RCA Studio B', 'RCB Studio C', 'v'),
P('nash_tootsies', 'nashville', 'bar', 1960, 0, 'Tootsie\'s Orchid Lounge', 'Footsie\'s Orchid Lounge', ''),
P('nash_exit_in', 'nashville', 'venue', 1971, 0, 'Exit/In', 'Entrance/Out', 'v'),
P('nash_opry', 'nashville', 'theatre', 1974, 0, 'Grand Ole Opry House', 'Grand Old Oprah House', 'lm:nash_opry'),
P('nash_station_inn', 'nashville', 'bar', 1974, 0, 'Station Inn', 'Station Out', 'v'),
P('nash_bluebird', 'nashville', 'bar', 1982, 0, 'Bluebird Café', 'Redbird Café', ''),
P('nash_bridgestone', 'nashville', 'arena', 1996, 0, 'Bridgestone Arena', 'Bridgepebble Arena', ''),
P('nash_grimeys', 'nashville', 'store', 1999, 0, 'Grimey\'s New & Preloved Music', 'Grimy\'s Music', 'v'),
P('nash_schermerhorn', 'nashville', 'theatre', 2006, 0, 'Schermerhorn Symphony Center', 'Schermerhorny Symphony Center', ''),
P('nash_third_man', 'nashville', 'label', 2009, 0, 'Third Man Records', 'Fourth Man Records', ''),
// New Orleans
P('nola_congo_square', 'new_orleans', 'fest', 1817, 0, 'Congo Square', 'Congo Circle', 'v'),
P('nola_wwl', 'new_orleans', 'radio', 1922, 0, 'WWL', 'WWM', ''),
P('nola_saenger', 'new_orleans', 'theatre', 1927, 0, 'Saenger Theatre', 'Singer Theatre', ''),
P('nola_jm_studio', 'new_orleans', 'studio', 1945, 1956, 'J&M Recording Studio', 'K&N Recording Studio', 'v'),
P('nola_dew_drop', 'new_orleans', 'bar', 1945, 1970, 'Dew Drop Inn', 'Dew Drip Inn', 'v'),
P('nola_wwl_tv', 'new_orleans', 'tv', 1957, 0, 'WWL-TV', 'WWM-TV', 'v'),
P('nola_minit', 'new_orleans', 'label', 1959, 1964, 'Minit Records', 'Minute Records', 'v'),
P('nola_preservation', 'new_orleans', 'venue', 1961, 0, 'Preservation Hall', 'Conservation Hall', 'lm:nola_preservation'),
P('nola_fair_grounds', 'new_orleans', 'fest', 1972, 0, 'Fair Grounds (Jazz Fest)', 'Fair Playgrounds', 'v'),
P('nola_sea_saint', 'new_orleans', 'studio', 1973, 2005, 'Sea-Saint Studio', 'Sea-Sinner Studio', 'v'),
P('nola_maple_leaf', 'new_orleans', 'bar', 1974, 0, 'Maple Leaf Bar', 'Oak Leaf Bar', 'v'),
P('nola_superdome', 'new_orleans', 'arena', 1975, 0, 'Superdome', 'Hyperdome', 'lm:nola_dome'),
P('nola_tipitinas', 'new_orleans', 'venue', 1977, 0, 'Tipitina\'s', 'Tipitona\'s', ''),
P('nola_wwoz', 'new_orleans', 'radio', 1980, 0, 'WWOZ', 'WWOW', ''),
P('nola_snug_harbor', 'new_orleans', 'bar', 1983, 0, 'Snug Harbor', 'Snug Marina', 'v'),
P('nola_lmf', 'new_orleans', 'store', 1992, 0, 'Louisiana Music Factory', 'Louisiana Music Fabric', 'v'),
P('nola_house_of_blues', 'new_orleans', 'venue', 1994, 0, 'House of Blues', 'House of Greens', 'v'),
// Memphis
P('mem_palace', 'memphis', 'theatre', 1920, 1973, 'Palace Theater (Beale Street)', 'Palácio Theater (Beale Street)', 'v'),
P('mem_whbq', 'memphis', 'radio', 1925, 0, 'WHBQ', 'WHBK', 'v'),
P('mem_orpheum', 'memphis', 'theatre', 1928, 0, 'Orpheum Theatre', 'Orfeu Theatre', ''),
P('mem_overton_shell', 'memphis', 'venue', 1936, 0, 'Overton Park Shell (Levitt Shell)', 'Overtone Park Shell', ''),
P('mem_home_of_blues', 'memphis', 'store', 1946, 1970, 'Home of the Blues Record Shop', 'Home of the Blacks Record Shop', 'v'),
P('mem_pop_tunes', 'memphis', 'store', 1946, 2008, 'Poplar Tunes', 'Poplar Toons', 'v'),
P('mem_wdia', 'memphis', 'radio', 1947, 0, 'WDIA', 'WDIO', ''),
P('mem_wmc_tv', 'memphis', 'tv', 1948, 0, 'WMC-TV', 'WMB-TV', 'v'),
P('mem_sun', 'memphis', 'studio', 1950, 0, 'Sun Studio', 'Moon Studio', 'u lm:mem_sun'),
P('mem_royal', 'memphis', 'studio', 1956, 0, 'Royal Studios (Hi Records)', 'Regal Studios (Hello Records)', 'v'),
P('mem_stax', 'memphis', 'label', 1960, 1976, 'Stax Records (McLemore Ave.)', 'Stacks Records (McLemore Ave.)', ''),
P('mem_coliseum', 'memphis', 'arena', 1963, 2007, 'Mid-South Coliseum', 'Mid-North Coliseum', 'v'),
P('mem_ardent', 'memphis', 'studio', 1966, 0, 'Ardent Studios', 'Ardente Studios', 'v'),
P('mem_american', 'memphis', 'studio', 1967, 1972, 'American Sound Studio', 'Americana Sound Studio', 'v'),
P('mem_bb_king', 'memphis', 'bar', 1991, 0, 'B.B. King\'s Blues Club', 'C.C. Queen\'s Blues Club', ''),
P('mem_fedexforum', 'memphis', 'arena', 2004, 0, 'FedExForum', 'FastExForum', ''),
// Detroit
P('det_orchestra_hall', 'detroit', 'theatre', 1919, 0, 'Orchestra Hall', 'Orquestrinha Hall', ''),
P('det_wwj', 'detroit', 'radio', 1920, 0, 'WWJ', 'WWK', ''),
P('det_masonic', 'detroit', 'theatre', 1926, 0, 'Masonic Temple', 'Mosaic Temple', ''),
P('det_fox', 'detroit', 'theatre', 1928, 0, 'Fox Theatre', 'Wolf Theatre', ''),
P('det_united_sound', 'detroit', 'studio', 1933, 0, 'United Sound Systems', 'Unified Sound Systems', 'v'),
P('det_wjlb', 'detroit', 'radio', 1941, 0, 'WJLB', 'WJLD', 'v'),
P('det_fortune', 'detroit', 'label', 1946, 1995, 'Fortune Records', 'Fortuna Records', 'v'),
P('det_wxyz_tv', 'detroit', 'tv', 1948, 0, 'WXYZ-TV', 'WXYY-TV', 'v'),
P('det_flame_show_bar', 'detroit', 'bar', 1949, 1963, 'Flame Show Bar', 'Spark Show Bar', 'v'),
P('det_hitsville', 'detroit', 'studio', 1959, 0, 'Hitsville U.S.A.', 'Hitsburg U.S.A.', 'u lm:det_hitsville'),
P('det_cobo', 'detroit', 'arena', 1960, 2016, 'Cobo Arena', 'Coba Arena', 'v'),
P('det_grande', 'detroit', 'venue', 1966, 1973, 'Grande Ballroom', 'Grandioso Ballroom', 'v'),
P('det_donovan', 'detroit', 'label', 1968, 1973, 'Motown (Donovan Building)', 'Motortown (Donovan Building)', 'v'),
P('det_joe_louis', 'detroit', 'arena', 1979, 2018, 'Joe Louis Arena', 'Joe Lewis Arena', ''),
P('det_music_institute', 'detroit', 'venue', 1986, 1989, 'The Music Institute', 'The Music Instituto', 'v'),
P('det_gold_dollar', 'detroit', 'bar', 1996, 2004, 'Gold Dollar', 'Silver Dime', 'v'),
P('det_magic_stick', 'detroit', 'venue', 1996, 0, 'Magic Stick', 'Magic Twig', 'v'),
P('det_lca', 'detroit', 'arena', 2017, 0, 'Little Caesars Arena', 'Little Ceasers Arena', ''),
// Chicago
P('chi_auditorium', 'chicago', 'theatre', 1889, 0, 'Auditorium Theatre', 'Auditoriozinho Theatre', ''),
P('chi_symphony', 'chicago', 'theatre', 1904, 0, 'Orchestra Hall (Symphony Center)', 'Orchestra Hole (Symphony Centre)', ''),
P('chi_green_mill', 'chicago', 'bar', 1907, 0, 'Green Mill', 'Green Windmill', 'v'),
P('chi_sunset_cafe', 'chicago', 'bar', 1921, 1937, 'Sunset Café', 'Sunrise Café', 'v'),
P('chi_wls', 'chicago', 'radio', 1924, 0, 'WLS', 'WLZ', ''),
P('chi_aragon', 'chicago', 'venue', 1926, 0, 'Aragon Ballroom', 'Paragon Ballroom', ''),
P('chi_stadium', 'chicago', 'arena', 1929, 1995, 'Chicago Stadium', 'Chicagoland Stadium', ''),
P('chi_wgn_tv', 'chicago', 'tv', 1948, 0, 'WGN-TV', 'WGM-TV', ''),
P('chi_vee_jay', 'chicago', 'label', 1953, 1966, 'Vee-Jay Records', 'Bee-Jay Records', 'v'),
P('chi_chess', 'chicago', 'studio', 1957, 1966, 'Chess Records (2120 S. Michigan)', 'Checkers Records (2120 S. Michigan)', 'lm:chi_chess'),
P('chi_jazz_record_mart', 'chicago', 'store', 1959, 2016, 'Jazz Record Mart', 'Jazz Record Market', 'v'),
P('chi_wvon', 'chicago', 'radio', 1963, 0, 'WVON', 'WVOM', 'v'),
P('chi_kingston_mines', 'chicago', 'bar', 1968, 0, 'Kingston Mines', 'Kingston Quarries', 'v'),
P('chi_checkerboard', 'chicago', 'bar', 1972, 0, 'Checkerboard Lounge', 'Chessboard Lounge', 'v'),
P('chi_warehouse', 'chicago', 'venue', 1977, 1983, 'The Warehouse', 'The Storehouse', 'v'),
P('chi_metro', 'chicago', 'venue', 1982, 0, 'Metro', 'Metrô', ''),
P('chi_united_center', 'chicago', 'arena', 1994, 0, 'United Center', 'Unified Center', ''),
P('chi_electrical_audio', 'chicago', 'studio', 1997, 0, 'Electrical Audio', 'Electrical Áudio-Visual', 'v'),
P('chi_grant_park', 'chicago', 'fest', 2005, 0, 'Grant Park (Lollapalooza)', 'Grant Garden', ''),
// London
P('lon_abbey_road', 'london', 'studio', 1931, 0, 'Abbey Road Studios', 'Abbey Lane Studios', 'u lm:lon_abbey'),
P('lon_royal_albert_hall', 'london', 'theatre', 1871, 0, 'Royal Albert Hall', 'Royal Alberto Hall', 'lm:lon_rah'),
P('lon_bbc_radio', 'london', 'radio', 1932, 0, 'BBC Broadcasting House', 'BCB Broadcasting House', ''),
P('lon_capital_radio', 'london', 'radio', 1973, 0, 'Capital Radio', 'Capitão Radio', ''),
P('lon_bbc_tv_centre', 'london', 'tv', 1960, 2013, 'BBC Television Centre', 'BCB Telly Centre', ''),
P('lon_marquee', 'london', 'venue', 1958, 1989, 'Marquee Club', 'Marquise Club', 'v'),
P('lon_100_club', 'london', 'venue', 1942, 0, '100 Club', '101 Club', ''),
P('lon_ronnie_scotts', 'london', 'bar', 1959, 0, 'Ronnie Scott\'s', 'Donnie Scott\'s', ''),
P('lon_roundhouse', 'london', 'venue', 1966, 0, 'The Roundhouse', 'The Squarehouse', 'v'),
P('lon_hammersmith_odeon', 'london', 'theatre', 1932, 0, 'Hammersmith Odeon', 'Hammersmith Odeão', ''),
P('lon_rainbow', 'london', 'theatre', 1971, 1982, 'Rainbow Theatre', 'Arco-Íris Theatre', 'v'),
P('lon_astoria', 'london', 'venue', 1985, 2009, 'London Astoria', 'London Asteria', 'v'),
P('lon_wembley_old', 'london', 'arena', 1923, 2003, 'Wembley Stadium (antigo)', 'Wembleia Stadium (antigo)', ''),
P('lon_wembley', 'london', 'arena', 2007, 0, 'Wembley Stadium', 'Wembleia Stadium', ''),
P('lon_o2', 'london', 'arena', 2007, 0, 'The O2', 'The H2O', ''),
P('lon_olympic_studios', 'london', 'studio', 1966, 2009, 'Olympic Studios', 'Olimpíada Studios', 'v'),
P('lon_trident', 'london', 'studio', 1968, 1981, 'Trident Studios', 'Tridente Studios', 'v'),
P('lon_emi', 'london', 'label', 1931, 2013, 'EMI', 'MEI Records', 'v'),
P('lon_rough_trade', 'london', 'store', 1976, 0, 'Rough Trade', 'Tough Trade', ''),
P('lon_hmv_oxford', 'london', 'store', 1921, 0, 'HMV Oxford Street', 'HMB Oxford Street', 'v'),
// Liverpool
P('liv_cavern', 'liverpool', 'venue', 1957, 1973, 'Cavern Club', 'Caverna Club', 'u lm:liv_cavern'),
P('liv_cavern_new', 'liverpool', 'venue', 1984, 0, 'Cavern Club (reconstruído)', 'Caverna Club (reconstruído)', ''),
P('liv_casbah', 'liverpool', 'venue', 1959, 1962, 'Casbah Coffee Club', 'Kasbah Coffee Club', ''),
P('liv_jacaranda', 'liverpool', 'bar', 1958, 0, 'The Jacaranda', 'The Jabuticaba', 'v'),
P('liv_philharmonic', 'liverpool', 'theatre', 1939, 0, 'Liverpool Philharmonic Hall', 'Liverpool Filarmônica Hall', ''),
P('liv_empire', 'liverpool', 'theatre', 1925, 0, 'Liverpool Empire Theatre', 'Liverpool Empério Theatre', ''),
P('liv_stadium', 'liverpool', 'arena', 1932, 1987, 'Liverpool Stadium', 'Liverpool Estádio', 'v'),
P('liv_nems', 'liverpool', 'store', 1959, 1971, 'NEMS (Whitechapel)', 'MENS Discos (Whitechapel)', 'v'),
P('liv_erics', 'liverpool', 'venue', 1976, 1980, 'Eric\'s', 'Derek\'s', ''),
P('liv_probe', 'liverpool', 'store', 1971, 0, 'Probe Records', 'Prova Records', 'v'),
P('liv_radio_city', 'liverpool', 'radio', 1974, 0, 'Radio City', 'Rádio Cidadela', ''),
P('liv_bbc_merseyside', 'liverpool', 'radio', 1967, 0, 'BBC Radio Merseyside', 'BCB Radio Mersey', ''),
P('liv_echo_arena', 'liverpool', 'arena', 2008, 0, 'Echo Arena', 'Eco Arena', ''),
P('liv_anfield', 'liverpool', 'arena', 1884, 0, 'Anfield', 'Anfieldinho', 'v'),
// Manchester
P('man_free_trade_hall', 'manchester', 'theatre', 1856, 1997, 'Free Trade Hall', 'Fair Trade Hall', 'lm:man_fth'),
P('man_old_trafford', 'manchester', 'arena', 1910, 0, 'Old Trafford', 'Old Stafford', 'lm:man_trafford'),
P('man_hacienda', 'manchester', 'venue', 1982, 1997, 'The Haçienda', 'The Fazenda', 'u'),
P('man_fr_label', 'manchester', 'label', 1978, 1992, 'Factory Records', 'Fábrica Records', ''),
P('man_granada', 'manchester', 'tv', 1956, 2013, 'Granada Studios', 'Romã Studios', ''),
P('man_piccadilly_radio', 'manchester', 'radio', 1974, 0, 'Piccadilly Radio', 'Piccadolly Radio', 'v'),
P('man_apollo', 'manchester', 'theatre', 1938, 0, 'Manchester Apollo', 'Manchester Apolinho', ''),
P('man_ritz', 'manchester', 'venue', 1928, 0, 'The Ritz', 'The Ritzy', 'v'),
P('man_twisted_wheel', 'manchester', 'bar', 1963, 1971, 'Twisted Wheel', 'Twisted Roda', 'v'),
P('man_band_on_the_wall', 'manchester', 'bar', 1975, 0, 'Band on the Wall', 'Banda no Muro', 'v'),
P('man_strawberry', 'manchester', 'studio', 1968, 1993, 'Strawberry Studios', 'Morango Studios', 'v'),
P('man_arena', 'manchester', 'arena', 1995, 0, 'Manchester Arena', 'Manchester Areia', ''),
P('man_bridgewater', 'manchester', 'theatre', 1996, 0, 'Bridgewater Hall', 'Bridgewaiter Hall', ''),
P('man_piccadilly_records', 'manchester', 'store', 1978, 0, 'Piccadilly Records', 'Piccadolly Discos', 'v'),
// Paris
P('par_olympia', 'paris', 'theatre', 1893, 0, 'Olympia', 'Olympiette', 'u lm:par_olympia'),
P('par_opera_garnier', 'paris', 'theatre', 1875, 0, 'Opéra Garnier', 'Opéra Garnir', ''),
P('par_moulin_rouge', 'paris', 'bar', 1889, 0, 'Moulin Rouge', 'Moulin Rose', ''),
P('par_chat_noir', 'paris', 'bar', 1881, 1897, 'Le Chat Noir', 'Le Chien Noir', ''),
P('par_folies_bergere', 'paris', 'theatre', 1869, 0, 'Folies Bergère', 'Folies Bergamote', ''),
P('par_bataclan', 'paris', 'venue', 1865, 0, 'Bataclan', 'Patatraclan', ''),
P('par_bobino', 'paris', 'theatre', 1873, 0, 'Bobino', 'Bobina', 'v'),
P('par_salle_pleyel', 'paris', 'theatre', 1927, 0, 'Salle Pleyel', 'Salle Playful', ''),
P('par_caveau_huchette', 'paris', 'bar', 1946, 0, 'Le Caveau de la Huchette', 'Le Caveau de la Hachette', ''),
P('par_maison_radio', 'paris', 'radio', 1963, 0, 'Maison de la Radio', 'Maison de la Rádio-Vitrola', ''),
P('par_europe1', 'paris', 'radio', 1955, 0, 'Europe 1', 'Europa Um', ''),
P('par_tf1', 'paris', 'tv', 1975, 0, 'TF1', 'TF Um', ''),
P('par_pathe', 'paris', 'label', 1896, 0, 'Pathé', 'Patê Records', 'v'),
P('par_barclay', 'paris', 'label', 1953, 0, 'Disques Barclay', 'Disques Barclé', 'v'),
P('par_studio_davout', 'paris', 'studio', 1965, 2010, 'Studio Davout', 'Studio Dafoult', 'v'),
P('par_fnac', 'paris', 'store', 1954, 0, 'Fnac', 'Fnoc', 'v'),
P('par_zenith', 'paris', 'arena', 1984, 0, 'Zénith de Paris', 'Nadir de Paris', ''),
P('par_bercy', 'paris', 'arena', 1984, 0, 'Palais Omnisports de Paris-Bercy', 'Palais Omnisports de Paris-Berço', ''),
P('par_stade_france', 'paris', 'arena', 1998, 0, 'Stade de France', 'Stade de Francette', ''),
P('par_rock_en_seine', 'paris', 'fest', 2003, 0, 'Rock en Seine', 'Rock en Sena', ''),
// Berlin
P('ber_hansa', 'berlin', 'studio', 1976, 0, 'Hansa Studios', 'Hanse Studios', 'u'),
P('ber_wintergarten', 'berlin', 'theatre', 1887, 1945, 'Wintergarten Varieté', 'Sommergarten Varieté', 'v'),
P('ber_alte_philharmonie', 'berlin', 'theatre', 1882, 1944, 'Alte Philharmonie', 'Alte Filarmonia', ''),
P('ber_philharmonie', 'berlin', 'theatre', 1963, 0, 'Berliner Philharmonie', 'Berliner Filarmonia', ''),
P('ber_admiralspalast', 'berlin', 'theatre', 1911, 0, 'Admiralspalast', 'Generalspalast', ''),
P('ber_haus_rundfunks', 'berlin', 'radio', 1931, 0, 'Haus des Rundfunks', 'Haus des Rundfinks', ''),
P('ber_rias', 'berlin', 'radio', 1946, 1994, 'RIAS', 'RIOS', ''),
P('ber_dff', 'berlin', 'tv', 1952, 1992, 'Deutscher Fernsehfunk', 'Deutscher Fernsehfink', 'v'),
P('ber_amiga', 'berlin', 'label', 1947, 1994, 'Amiga', 'Amigo', 'v'),
P('ber_waldbuehne', 'berlin', 'theatre', 1936, 0, 'Waldbühne', 'Wildbühne', ''),
P('ber_olympiastadion', 'berlin', 'arena', 1936, 0, 'Olympiastadion', 'Olympiaschüssel', ''),
P('ber_so36', 'berlin', 'venue', 1978, 0, 'SO36', 'SO37', ''),
P('ber_dschungel', 'berlin', 'bar', 1978, 1994, 'Dschungel', 'Selva Club', 'v'),
P('ber_tresor', 'berlin', 'venue', 1991, 0, 'Tresor', 'Tesouro', ''),
P('ber_berghain', 'berlin', 'venue', 2004, 0, 'Berghain', 'Bergpain', ''),
P('ber_love_parade', 'berlin', 'fest', 1989, 2007, 'Love Parade (Tiergarten)', 'Dove Parade (Tiergarten)', 'v'),
P('ber_mercedes_arena', 'berlin', 'arena', 2008, 0, 'Mercedes-Benz Arena', 'Mercedinha Arena', ''),
P('ber_hard_wax', 'berlin', 'store', 1989, 0, 'Hard Wax', 'Soft Wax', ''),
P('ber_dussmann', 'berlin', 'store', 1997, 0, 'Dussmann das KulturKaufhaus', 'Dussfrau das KulturKaufhaus', ''),
// Tokyo
P('tok_budokan', 'tokyo', 'arena', 1964, 0, 'Nippon Budokan', 'Nippon Bushokan', 'u lm:tok_budokan'),
P('tok_kabukiza', 'tokyo', 'theatre', 1889, 0, 'Kabuki-za', 'Kabuki-zinho', 'v'),
P('tok_hibiya', 'tokyo', 'theatre', 1923, 0, 'Hibiya Yagai Ongakudō', 'Hibaya Yagai Ongakudō', ''),
P('tok_nhk_radio', 'tokyo', 'radio', 1925, 0, 'NHK Radio', 'NHQ Radio', ''),
P('tok_nhk_tv', 'tokyo', 'tv', 1953, 0, 'NHK', 'NHQ', ''),
P('tok_tbs', 'tokyo', 'tv', 1955, 0, 'TBS', 'TBC', ''),
P('tok_fuji_tv', 'tokyo', 'tv', 1959, 0, 'Fuji TV', 'Monte TV', ''),
P('tok_columbia', 'tokyo', 'label', 1910, 0, 'Nippon Columbia', 'Nippon Colômbia', 'v'),
P('tok_victor', 'tokyo', 'label', 1927, 0, 'Victor (JVC)', 'Vencedor (JVC)', 'v'),
P('tok_cbs_sony', 'tokyo', 'label', 1968, 0, 'CBS/Sony Records', 'CBS/Sonny Records', ''),
P('tok_pit_inn', 'tokyo', 'bar', 1965, 0, 'Shinjuku Pit Inn', 'Shinjuku Pit Stop', ''),
P('tok_shinjuku_loft', 'tokyo', 'venue', 1976, 0, 'Shinjuku Loft', 'Shinjuku Sótão', ''),
P('tok_liquidroom', 'tokyo', 'venue', 1994, 0, 'Liquidroom', 'Solidroom', 'v'),
P('tok_suntory_hall', 'tokyo', 'theatre', 1986, 0, 'Suntory Hall', 'Sunstory Hall', ''),
P('tok_tokyo_dome', 'tokyo', 'arena', 1988, 0, 'Tokyo Dome', 'Tokyo Cúpula', ''),
P('tok_disk_union', 'tokyo', 'store', 1969, 0, 'Disk Union', 'Disk Onion', ''),
P('tok_tower_shibuya', 'tokyo', 'store', 1981, 0, 'Tower Records Shibuya', 'Torre Records Shibuya', 'v'),
// Kingston
P('kin_studio_one', 'kingston', 'studio', 1963, 1980, 'Studio One', 'Studio Uno', 'u v lm:kgn_studio1'),
P('kin_federal', 'kingston', 'label', 1954, 1981, 'Federal Records', 'Federativa Records', 'v'),
P('kin_treasure_isle', 'kingston', 'studio', 1965, 1975, 'Treasure Isle', 'Treasure Ilha', 'v'),
P('kin_dynamic', 'kingston', 'studio', 1969, 0, 'Dynamic Sounds', 'Dinâmico Sounds', 'v'),
P('kin_black_ark', 'kingston', 'studio', 1973, 1980, 'Black Ark', 'Black Arca', 'v'),
P('kin_channel_one', 'kingston', 'studio', 1972, 1990, 'Channel One', 'Canal Um', 'v'),
P('kin_tuff_gong', 'kingston', 'studio', 1976, 0, 'Tuff Gong (56 Hope Road)', 'Tough Gongo (56 Hope Road)', 'v'),
P('kin_randys', 'kingston', 'store', 1959, 1977, 'Randy\'s Record Mart', 'Andy\'s Record Mart', 'v'),
P('kin_rjr', 'kingston', 'radio', 1950, 0, 'Radio Jamaica (RJR)', 'Rádio Jamaicana (RJJ)', ''),
P('kin_jbc', 'kingston', 'tv', 1959, 1997, 'JBC', 'JCB', ''),
P('kin_ward_theatre', 'kingston', 'theatre', 1912, 0, 'Ward Theatre', 'Word Theatre', ''),
P('kin_carib', 'kingston', 'theatre', 1938, 0, 'Carib Theatre', 'Caribe Theatre', 'v'),
P('kin_national_stadium', 'kingston', 'arena', 1962, 0, 'National Stadium', 'Natural Stadium', ''),
// Havana
P('hav_gran_teatro', 'havana', 'theatre', 1838, 0, 'Gran Teatro de La Habana', 'Gran Teatro de La Habanita', ''),
P('hav_floridita', 'havana', 'bar', 1817, 0, 'El Floridita', 'El Floridito', 'v'),
P('hav_teatro_auditorium', 'havana', 'theatre', 1929, 0, 'Teatro Amadeo Roldán', 'Teatro Amadeu Roldão', 'v'),
P('hav_radio_progreso', 'havana', 'radio', 1929, 0, 'Radio Progreso', 'Radio Progressinho', 'v'),
P('hav_cmq', 'havana', 'radio', 1933, 1962, 'CMQ Radio', 'CMK Radio', 'v'),
P('hav_cmq_tv', 'havana', 'tv', 1950, 1962, 'CMQ Televisión', 'CMK Televisión', 'v'),
P('hav_parisien', 'havana', 'bar', 1930, 0, 'Cabaret Parisién (Hotel Nacional)', 'Cabaret Parisiense (Hotel Nacional)', 'v'),
P('hav_tropicana', 'havana', 'venue', 1939, 0, 'Tropicana', 'Tropicaninha', 'lm:hav_tropicana'),
P('hav_panart', 'havana', 'label', 1944, 1961, 'Panart', 'Panarte', 'v'),
P('hav_radio_rebelde', 'havana', 'radio', 1958, 0, 'Radio Rebelde', 'Radio Rebeldinha', ''),
P('hav_karl_marx', 'havana', 'theatre', 1958, 0, 'Teatro Karl Marx', 'Teatro Groucho Marx', 'v'),
P('hav_egrem', 'havana', 'studio', 1964, 0, 'EGREM (Estudios Areíto)', 'EGREN (Estudios Areítinho)', 'v'),
P('hav_zorra_cuervo', 'havana', 'bar', 1995, 0, 'La Zorra y el Cuervo', 'El Zorro y la Cuerva', 'v'),
P('hav_casa_musica', 'havana', 'venue', 1994, 0, 'Casa de la Música (Miramar)', 'Casa de la Musiquita (Miramar)', 'v'),
// Buenos Aires
P('ba_cafe_tortoni', 'buenos_aires', 'bar', 1858, 0, 'Café Tortoni', 'Café Tortinha', ''),
P('ba_teatro_opera', 'buenos_aires', 'theatre', 1872, 0, 'Teatro Ópera', 'Teatro Operita', 'v'),
P('ba_colon', 'buenos_aires', 'theatre', 1908, 0, 'Teatro Colón', 'Teatro Colombo', 'lm:ba_colon'),
P('ba_radio_mitre', 'buenos_aires', 'radio', 1925, 0, 'Radio Mitre', 'Radio Mitra', ''),
P('ba_radio_el_mundo', 'buenos_aires', 'radio', 1935, 1990, 'Radio El Mundo', 'Radio El Mundito', 'v'),
P('ba_luna_park', 'buenos_aires', 'arena', 1932, 0, 'Luna Park', 'Sol Park', ''),
P('ba_gran_rex', 'buenos_aires', 'theatre', 1937, 0, 'Teatro Gran Rex', 'Teatro Gran Rei', ''),
P('ba_monumental', 'buenos_aires', 'arena', 1938, 0, 'Estadio Monumental', 'Estadio Monumentoso', ''),
P('ba_canal7', 'buenos_aires', 'tv', 1951, 0, 'Canal 7 (TV Pública)', 'Canal 8 (TV Pública)', ''),
P('ba_canal13', 'buenos_aires', 'tv', 1960, 0, 'Canal 13', 'Canal 31', ''),
P('ba_ion', 'buenos_aires', 'studio', 1960, 0, 'Estudios ION', 'Estudios Átomo', 'v'),
P('ba_la_cueva', 'buenos_aires', 'bar', 1965, 1967, 'La Cueva', 'La Cuevita', 'v'),
P('ba_obras', 'buenos_aires', 'arena', 1978, 0, 'Estadio Obras Sanitarias', 'Estadio Obritas Sanitarias', 'v'),
P('ba_cemento', 'buenos_aires', 'venue', 1985, 2004, 'Cemento', 'Concreto', 'v'),
P('ba_zivals', 'buenos_aires', 'store', 1960, 2012, 'Zival\'s', 'Zivul\'s', 'v'),
P('ba_niceto', 'buenos_aires', 'venue', 1995, 0, 'Niceto Club', 'Nicerto Club', 'v'),
P('ba_vorterix', 'buenos_aires', 'venue', 2012, 0, 'Teatro Vorterix', 'Teatro Vórtice', ''),
// Mexico City
P('mx_salon_mexico', 'mexico_city', 'bar', 1920, 1962, 'Salón México', 'Salón Mexiquito', 'v'),
P('mx_garibaldi', 'mexico_city', 'bar', 1920, 0, 'Plaza Garibaldi', 'Plaza Garibalda', 'v'),
P('mx_radio_educacion', 'mexico_city', 'radio', 1924, 0, 'Radio Educación', 'Radio Educacioncita', 'v'),
P('mx_xew', 'mexico_city', 'radio', 1930, 0, 'XEW', 'XWE', ''),
P('mx_peerless', 'mexico_city', 'label', 1933, 0, 'Discos Peerless', 'Discos Peerfree', 'v'),
P('mx_bellas_artes', 'mexico_city', 'theatre', 1934, 0, 'Palacio de Bellas Artes', 'Palacio de Bellas Partes', 'lm:mx_bellas'),
P('mx_salon_los_angeles', 'mexico_city', 'bar', 1937, 0, 'Salón Los Ángeles', 'Salón Los Diablos', ''),
P('mx_metropolitan', 'mexico_city', 'theatre', 1943, 0, 'Teatro Metropólitan', 'Teatro Metropolitinho', 'v'),
P('mx_auditorio_nacional', 'mexico_city', 'arena', 1952, 0, 'Auditorio Nacional', 'Auditorio Natural', ''),
P('mx_televisa', 'mexico_city', 'tv', 1955, 0, 'Televisa (Chapultepec)', 'Telelisa (Chapultepec)', 'v'),
P('mx_blanquita', 'mexico_city', 'theatre', 1960, 2015, 'Teatro Blanquita', 'Teatro Blanquinha', 'v'),
P('mx_azteca', 'mexico_city', 'arena', 1966, 0, 'Estadio Azteca', 'Estadio Maya', ''),
P('mx_palacio_deportes', 'mexico_city', 'arena', 1968, 0, 'Palacio de los Deportes', 'Palacio de los Deportitos', ''),
P('mx_chopo', 'mexico_city', 'store', 1980, 0, 'Tianguis Cultural del Chopo', 'Tianguis Cultural del Choppo', ''),
P('mx_rockotitlan', 'mexico_city', 'venue', 1985, 2004, 'Rockotitlán', 'Roquetitlán', 'v'),
P('mx_foro_sol', 'mexico_city', 'arena', 1993, 0, 'Foro Sol', 'Foro Luna', ''),
// Recife
P('rec_radio_clube', 'recife', 'radio', 1919, 0, 'Rádio Clube de Pernambuco', 'Rádio Clubinho de Pernambuco', 'v'),
P('rec_jornal_commercio', 'recife', 'radio', 1948, 0, 'Rádio Jornal do Commercio', 'Rádio Diário do Comércio', 'v'),
P('rec_santa_isabel', 'recife', 'theatre', 1850, 0, 'Teatro de Santa Isabel', 'Teatro de Santa Isabela', ''),
P('rec_tv_jornal', 'recife', 'tv', 1960, 0, 'TV Jornal', 'TV Jornaleco', 'v'),
P('rec_rozenblit', 'recife', 'label', 1954, 1984, 'Fábrica de Discos Rozenblit', 'Fábrica de Discos Rosablit', 'v'),
P('rec_abril_pro_rock', 'recife', 'fest', 1993, 0, 'Abril Pro Rock', 'Abril Pro Roque', 'v'),
// Belo Horizonte
P('bh_inconfidencia', 'bh', 'radio', 1936, 0, 'Rádio Inconfidência', 'Rádio Confidência', ''),
P('bh_itatiaia', 'bh', 'radio', 1952, 0, 'Rádio Itatiaia', 'Rádio Itatiaiá', ''),
P('bh_palacio_artes', 'bh', 'theatre', 1971, 0, 'Palácio das Artes', 'Palacete das Artes', ''),
P('bh_mineirao', 'bh', 'arena', 1965, 0, 'Mineirão', 'Mineirinho Grande', ''),
P('bh_cogumelo', 'bh', 'store', 1980, 0, 'Cogumelo Discos', 'Cogumelo Records Mágicos', 'v'),
// Seattle
P('sea_kexp', 'seattle', 'radio', 1972, 0, 'KEXP', 'KEXQ', 'v'),
P('sea_sub_pop', 'seattle', 'label', 1988, 0, 'Sub Pop', 'Sub Soda', ''),
P('sea_crocodile', 'seattle', 'venue', 1991, 0, 'The Crocodile', 'The Alligator', 'v'),
P('sea_paramount', 'seattle', 'theatre', 1928, 0, 'Paramount Theatre', 'Paramountain Theatre', ''),
P('sea_easy_street', 'seattle', 'store', 1988, 0, 'Easy Street Records', 'Breezy Street Records', 'v'),
P('sea_london_bridge', 'seattle', 'studio', 1985, 0, 'London Bridge Studio', 'Paris Bridge Studio', 'v'),
// Bogotá
P('bog_radio_nacional', 'bogota', 'radio', 1940, 0, 'Radio Nacional de Colombia', 'Radio Nacionalita de Colombia', ''),
P('bog_colon', 'bogota', 'theatre', 1892, 0, 'Teatro Colón', 'Teatro Colombo', ''),
P('bog_caracol', 'bogota', 'radio', 1948, 0, 'Caracol Radio', 'Caracolito Radio', ''),
P('bog_rock_parque', 'bogota', 'fest', 1995, 0, 'Rock al Parque (Parque Simón Bolívar)', 'Roque al Parque', ''),
P('bog_movistar_arena', 'bogota', 'arena', 2018, 0, 'Movistar Arena', 'Movimiento Arena', ''),
// Estocolmo
P('sto_sr', 'stockholm', 'radio', 1925, 0, 'Sveriges Radio', 'Sverige Radiot', 'v'),
P('sto_polar', 'stockholm', 'studio', 1978, 2004, 'Polar Studios', 'Solar Studios', 'v'),
P('sto_konserthuset', 'stockholm', 'theatre', 1926, 0, 'Konserthuset', 'Konsertkuset', ''),
P('sto_globen', 'stockholm', 'arena', 1989, 0, 'Globen (Ericsson Globe)', 'Globinho', ''),
P('sto_cheiron', 'stockholm', 'studio', 1992, 2000, 'Cheiron Studios', 'Chiron Studios', 'v'),
// Milão
P('mil_scala', 'milan', 'theatre', 1778, 0, 'Teatro alla Scala', 'Teatro alla Scaletta', 'lm:mil_scala'),
P('mil_ricordi', 'milan', 'label', 1808, 0, 'Casa Ricordi', 'Casa Ricorda', ''),
P('mil_san_siro', 'milan', 'arena', 1926, 0, 'Stadio San Siro', 'Stadio San Ciro', ''),
P('mil_alcatraz', 'milan', 'venue', 1997, 0, 'Alcatraz', 'Alcaçuz', 'v'),
P('mil_derby_club', 'milan', 'bar', 1962, 1985, 'Derby Club', 'Dérbi Clube', 'v'),
// Dublin
P('dub_rte', 'dublin', 'radio', 1926, 0, 'RTÉ Radio (2RN)', 'RTÊ Rádio', ''),
P('dub_windmill_lane', 'dublin', 'studio', 1978, 0, 'Windmill Lane Studios', 'Windpump Lane Studios', 'v'),
P('dub_olympia', 'dublin', 'theatre', 1879, 0, 'Olympia Theatre', 'Olympinha Theatre', ''),
P('dub_whelans', 'dublin', 'bar', 1989, 0, 'Whelan\'s', 'Phelan\'s', 'v'),
P('dub_point', 'dublin', 'arena', 1988, 0, 'The Point (3Arena)', 'The Ponto', 'v'),
// Lisboa
P('lis_coliseu', 'lisbon', 'theatre', 1890, 0, 'Coliseu dos Recreios', 'Coliseu dos Recreinhos', ''),
P('lis_rtp', 'lisbon', 'tv', 1957, 0, 'RTP', 'RTV Portuguesa', ''),
P('lis_renascenca', 'lisbon', 'radio', 1937, 0, 'Rádio Renascença', 'Rádio Renascidinha', ''),
P('lis_sao_carlos', 'lisbon', 'theatre', 1793, 0, 'Teatro Nacional de São Carlos', 'Teatro Nacional de São Carlitos', ''),
P('lis_adega_machado', 'lisbon', 'bar', 1937, 0, 'Adega Machado', 'Adega Machadinho', 'v'),
P('lis_altice_arena', 'lisbon', 'arena', 1998, 0, 'Pavilhão Atlântico (Altice Arena)', 'Pavilhão Pacífico', ''),
// Seul
P('seo_kbs', 'seoul', 'tv', 1961, 0, 'KBS', 'KBC', ''),
P('seo_sejong', 'seoul', 'theatre', 1978, 0, 'Sejong Center', 'Sejonginho Center', ''),
P('seo_sm', 'seoul', 'label', 1995, 0, 'SM Entertainment', 'SN Entertainment', ''),
P('seo_olympic_stadium', 'seoul', 'arena', 1984, 0, 'Estádio Olímpico de Seul (Jamsil)', 'Estádio Olímpico de Seulzinho', ''),
P('seo_rolling_hall', 'seoul', 'venue', 1995, 0, 'Rolling Hall (Hongdae)', 'Rolando Hall', 'v'),
// Mumbai
P('mum_air', 'mumbai', 'radio', 1927, 0, 'All India Radio (Bombaim)', 'All India Rádio Bombom', 'v'),
P('mum_royal_opera', 'mumbai', 'theatre', 1911, 0, 'Royal Opera House', 'Royal Ópera Casa', ''),
P('mum_hmv_india', 'mumbai', 'label', 1928, 0, 'HMV India (Saregama)', 'HMB India', 'v'),
P('mum_ncpa', 'mumbai', 'theatre', 1969, 0, 'NCPA', 'NCPB', 'v'),
P('mum_rhythm_house', 'mumbai', 'store', 1948, 2015, 'Rhythm House', 'Rhyme House', 'v'),
// Hong Kong
P('hk_rthk', 'hong_kong', 'radio', 1928, 0, 'RTHK', 'RTHC', ''),
P('hk_tvb', 'hong_kong', 'tv', 1967, 0, 'TVB', 'TVV', ''),
P('hk_coliseum', 'hong_kong', 'arena', 1983, 0, 'Hong Kong Coliseum', 'Hong Kong Coliseuzinho', ''),
P('hk_city_hall', 'hong_kong', 'theatre', 1962, 0, 'Hong Kong City Hall', 'Hong Kong Town Hall', ''),
// Bangkok
P('bkk_radio_thailand', 'bangkok', 'radio', 1930, 0, 'Radio Thailand', 'Rádio Tailandinha', 'v'),
P('bkk_saxophone', 'bangkok', 'bar', 1987, 0, 'Saxophone Pub', 'Clarinete Pub', 'v'),
P('bkk_grammy', 'bangkok', 'label', 1983, 0, 'GMM Grammy', 'GMM Gramado', ''),
P('bkk_impact', 'bangkok', 'arena', 1999, 0, 'Impact Arena', 'Impacto Arena', 'v'),
// Beirute
P('bei_baalbek', 'beirut', 'fest', 1956, 0, 'Festival Internacional de Baalbek', 'Festival Internacional de Baalbequinho', 'v'),
P('bei_radio_liban', 'beirut', 'radio', 1938, 0, 'Radio Liban', 'Rádio Libanês', 'v'),
P('bei_piccadilly', 'beirut', 'theatre', 1967, 2001, 'Théâtre Piccadilly', 'Théâtre Piccadilla', 'v'),
P('bei_music_hall', 'beirut', 'venue', 2003, 0, 'Music Hall', 'Músico Hall', 'v'),
// Istambul
P('ist_trt', 'istanbul', 'radio', 1927, 0, 'Rádio de Istambul (TRT)', 'Rádio de Istambulzinho', 'v'),
P('ist_babylon', 'istanbul', 'venue', 1999, 0, 'Babylon', 'Babilônia', 'v'),
P('ist_ataturk_kultur', 'istanbul', 'theatre', 1969, 2018, 'Centro Cultural Atatürk', 'Centro Cultural Ataturco', 'v'),
P('ist_harbiye', 'istanbul', 'theatre', 1947, 0, 'Teatro ao Ar Livre de Harbiye', 'Teatro ao Ar Livre de Harbiyinho', 'v'),
// Lagos
P('lag_shrine', 'lagos', 'venue', 1970, 1977, 'Afrika Shrine (Empire Hotel)', 'Afrika Templo', 'u v'),
P('lag_new_shrine', 'lagos', 'venue', 2000, 0, 'New Afrika Shrine', 'Novo Afrika Templo', 'v'),
P('lag_radio_nigeria', 'lagos', 'radio', 1957, 0, 'Radio Nigeria', 'Rádio Nigerinha', 'v'),
P('lag_nta', 'lagos', 'tv', 1977, 0, 'NTA', 'NTB', 'v'),
P('lag_national_theatre', 'lagos', 'theatre', 1976, 0, 'National Theatre (Iganmu)', 'Nacional Teatrinho', ''),
// Joanesburgo
P('jnb_sabc', 'johannesburg', 'radio', 1936, 0, 'SABC', 'SABE', ''),
P('jnb_market_theatre', 'johannesburg', 'theatre', 1976, 0, 'Market Theatre', 'Mercadinho Theatre', ''),
P('jnb_gallo', 'johannesburg', 'label', 1926, 0, 'Gallo Record Company', 'Galo Record Company', 'v'),
P('jnb_fnb_stadium', 'johannesburg', 'arena', 1989, 0, 'FNB Stadium (Soccer City)', 'Estádio Cabaça', 'v'),
P('jnb_bassline', 'johannesburg', 'venue', 1994, 2016, 'Bassline', 'Baixoline', 'v'),
// Cairo
P('cai_opera', 'cairo', 'theatre', 1869, 1971, 'Ópera Khedivial', 'Ópera Quedivinha', ''),
P('cai_new_opera', 'cairo', 'theatre', 1988, 0, 'Ópera do Cairo', 'Ópera do Cairinho', ''),
P('cai_sawt_al_qahira', 'cairo', 'radio', 1934, 0, 'Rádio do Cairo (ERTU)', 'Rádio da Cairolândia', 'v'),
P('cai_sono_cairo', 'cairo', 'label', 1959, 0, 'Sono Cairo', 'Sono Cairinho', 'v'),
// Dakar
P('dak_rts', 'dakar', 'radio', 1939, 0, 'Radio Sénégal (RTS)', 'Rádio Senegalzinho', 'v'),
P('dak_miami', 'dakar', 'bar', 1960, 1990, 'Miami Club', 'Miámi Clube', 'v'),
P('dak_thiossane', 'dakar', 'venue', 1996, 0, 'Thiossane', 'Thiossana', 'v'),
P('dak_sorano', 'dakar', 'theatre', 1965, 0, 'Théâtre National Daniel Sorano', 'Théâtre Daniel Soprano', ''),
// Sydney
P('syd_opera', 'sydney', 'theatre', 1973, 0, 'Sydney Opera House', 'Sydney Opera Casinha', 'lm:syd_opera'),
P('syd_abc', 'sydney', 'radio', 1932, 0, 'ABC Radio', 'ABD Radio', ''),
P('syd_triple_j', 'sydney', 'radio', 1975, 0, 'Triple J', 'Triple K', ''),
P('syd_festival_records', 'sydney', 'label', 1952, 2005, 'Festival Records', 'Festança Records', 'v'),
P('syd_enmore', 'sydney', 'theatre', 1908, 0, 'Enmore Theatre', 'Enless Theatre', 'v'),
// Melbourne
P('mel_mcg', 'melbourne', 'arena', 1853, 0, 'Melbourne Cricket Ground', 'Melbourne Críquete Ground', 'lm:mel_mcg'),
P('mel_corner', 'melbourne', 'bar', 1995, 0, 'Corner Hotel', 'Esquina Hotel', 'v'),
P('mel_festival_hall', 'melbourne', 'arena', 1956, 0, 'Festival Hall', 'Festança Hall', 'v'),
P('mel_rrr', 'melbourne', 'radio', 1976, 0, 'Triple R (3RRR)', 'Triple Erre', ''),
P('mel_hamer_hall', 'melbourne', 'theatre', 1982, 0, 'Hamer Hall', 'Hammer Hall', ''),
// Porto Alegre
P('poa_gaucha', 'porto_alegre', 'radio', 1927, 0, 'Rádio Gaúcha', 'Rádio Gauchinha', ''),
P('poa_ipanema_fm', 'porto_alegre', 'radio', 1983, 2017, 'Ipanema FM', 'Copacabana FM', 'v'),
P('poa_sao_pedro', 'porto_alegre', 'theatre', 1858, 0, 'Theatro São Pedro', 'Theatro São Paulinho', ''),
P('poa_opiniao', 'porto_alegre', 'venue', 1983, 0, 'Bar Opinião', 'Bar Achismo', 'v'),
P('poa_rbs_tv', 'porto_alegre', 'tv', 1962, 0, 'TV Gaúcha (RBS TV)', 'TV Gauchinha', ''),
// Curitiba
P('cwb_guaira', 'curitiba', 'theatre', 1974, 0, 'Teatro Guaíra', 'Teatro Guairinha Grande', 'v'),
P('cwb_pedreira', 'curitiba', 'arena', 1992, 0, 'Pedreira Paulo Leminski', 'Pedregulho Paulo Leminski', ''),
P('cwb_opera_arame', 'curitiba', 'theatre', 1992, 0, 'Ópera de Arame', 'Ópera de Barbante', ''),
P('cwb_tv_paranaense', 'curitiba', 'tv', 1960, 0, 'TV Paranaense', 'TV Paranaenzinha', 'v'),
// Belém
P('bel_theatro_paz', 'belem', 'theatre', 1878, 0, 'Theatro da Paz', 'Theatro da Calma', ''),
P('bel_radio_clube', 'belem', 'radio', 1928, 0, 'Rádio Clube do Pará', 'Rádio Clubinho do Pará', 'v'),
P('bel_tv_liberal', 'belem', 'tv', 1976, 0, 'TV Liberal', 'TV Libertina', 'v'),
P('bel_estacao_docas', 'belem', 'venue', 2000, 0, 'Estação das Docas', 'Estação dos Doces', 'v'),
// Fortaleza
P('for_jose_alencar', 'fortaleza', 'theatre', 1910, 0, 'Theatro José de Alencar', 'Theatro José de Alecrim', ''),
P('for_radio_verdes_mares', 'fortaleza', 'radio', 1962, 0, 'Rádio Verdes Mares', 'Rádio Verdes Marolas', 'v'),
P('for_tv_verdes_mares', 'fortaleza', 'tv', 1970, 0, 'TV Verdes Mares', 'TV Verdes Marolas', 'v'),
P('for_dragao_mar', 'fortaleza', 'venue', 1999, 0, 'Centro Dragão do Mar', 'Centro Lagartixa do Mar', ''),
// Brasília
P('bsb_teatro_nacional', 'brasilia', 'theatre', 1966, 0, 'Teatro Nacional Cláudio Santoro', 'Teatro Nacional Cláudio Santinho', 'v'),
P('bsb_radio_nacional', 'brasilia', 'radio', 1958, 0, 'Rádio Nacional de Brasília', 'Rádio Nacionalzinha de Brasília', 'v'),
P('bsb_mane_garrincha', 'brasilia', 'arena', 1974, 0, 'Estádio Mané Garrincha', 'Estádio Zé Garrincha', ''),
P('bsb_porao_rock', 'brasilia', 'fest', 1998, 0, 'Porão do Rock', 'Sótão do Rock', 'v'),
// Goiânia
P('gyn_goiania_arena', 'goiania', 'arena', 2000, 0, 'Goiânia Arena', 'Goiâninha Arena', 'v'),
P('gyn_bananada', 'goiania', 'fest', 1999, 0, 'Festival Bananada', 'Festival Maçãzada', 'v'),
P('gyn_tv_anhanguera', 'goiania', 'tv', 1963, 0, 'TV Anhanguera', 'TV Anhangueirinha', ''),
P('gyn_teatro_goiania', 'goiania', 'theatre', 1942, 0, 'Teatro Goiânia', 'Teatro Goianinha', 'v'),
// Austin
P('aus_antones', 'austin', 'venue', 1975, 0, 'Antone\'s', 'Antoine\'s', 'v'),
P('aus_armadillo', 'austin', 'venue', 1970, 1981, 'Armadillo World Headquarters', 'Tatu World Headquarters', ''),
P('aus_acl_studio', 'austin', 'tv', 1974, 0, 'Austin City Limits (KLRU)', 'Austin City Limites', ''),
P('aus_waterloo', 'austin', 'store', 1982, 0, 'Waterloo Records', 'Napoleão Records', ''),
P('aus_continental', 'austin', 'bar', 1957, 0, 'Continental Club', 'Continentinho Club', 'v'),
P('aus_sxsw', 'austin', 'fest', 1987, 0, 'SXSW', 'SXSO', ''),
// Atlanta
P('atl_fox', 'atlanta', 'theatre', 1929, 0, 'Fox Theatre', 'Raposa Theatre', ''),
P('atl_laf_label', 'atlanta', 'label', 1989, 2011, 'LaFace Records', 'LaFrente Records', 'v'),
P('atl_wsb', 'atlanta', 'radio', 1922, 0, 'WSB Radio', 'WSV Radio', ''),
P('atl_tabernacle', 'atlanta', 'venue', 1996, 0, 'Tabernacle', 'Tabernaculinho', ''),
P('atl_stankonia', 'atlanta', 'studio', 1998, 0, 'Stankonia Studios', 'Stinkonia Studios', 'v'),
// Filadélfia
P('phl_sigma_sound', 'philadelphia', 'studio', 1968, 2014, 'Sigma Sound Studios', 'Delta Sound Studios', 'v'),
P('phl_pir', 'philadelphia', 'label', 1971, 0, 'Philadelphia International Records', 'Philadelphia Internacionalzinha Records', ''),
P('phl_spectrum', 'philadelphia', 'arena', 1967, 2010, 'The Spectrum', 'The Espectro', ''),
P('phl_academy_music', 'philadelphia', 'theatre', 1857, 0, 'Academy of Music', 'Academia de Músicas', ''),
P('phl_bandstand', 'philadelphia', 'tv', 1952, 1964, 'American Bandstand (WFIL)', 'American Bandestante', ''),
// São Francisco
P('sf_fillmore', 'san_francisco', 'venue', 1965, 0, 'The Fillmore', 'The Fillmenos', 'u lm:sf_fillmore'),
P('sf_winterland', 'san_francisco', 'arena', 1928, 1978, 'Winterland Ballroom', 'Summerland Ballroom', ''),
P('sf_fantasy', 'san_francisco', 'label', 1949, 0, 'Fantasy Records', 'Fantasia Records', 'v'),
P('sf_kmpx', 'san_francisco', 'radio', 1962, 0, 'KMPX', 'KMPZ', 'v'),
P('sf_avalon', 'san_francisco', 'venue', 1966, 1969, 'Avalon Ballroom', 'Avalanche Ballroom', ''),
// Miami
P('mia_criteria', 'miami', 'studio', 1958, 0, 'Criteria Studios', 'Critério Studios', ''),
P('mia_tk', 'miami', 'label', 1972, 1981, 'TK Records', 'TKO Records', 'v'),
P('mia_fillmore', 'miami', 'theatre', 1951, 0, 'Jackie Gleason Theater (Fillmore Miami Beach)', 'Jackie Gleeson Theater', 'v'),
P('mia_univision', 'miami', 'tv', 1987, 0, 'Univision', 'Univisão', 'v'),
P('mia_ultra', 'miami', 'fest', 1999, 0, 'Ultra Music Festival', 'Mega Music Festival', ''),
// Toronto
P('tor_massey', 'toronto', 'theatre', 1894, 0, 'Massey Hall', 'Messy Hall', 'lm:tor_massey'),
P('tor_horseshoe', 'toronto', 'bar', 1947, 0, 'Horseshoe Tavern', 'Ferradura Tavern', ''),
P('tor_cbc', 'toronto', 'radio', 1936, 0, 'CBC Radio', 'CBD Radio', ''),
P('tor_sam_record_man', 'toronto', 'store', 1959, 2007, 'Sam the Record Man', 'Sam the Disco Man', ''),
P('tor_much', 'toronto', 'tv', 1984, 0, 'MuchMusic', 'ManyMusic', ''),
// Montreal
P('mtl_jazz_fest', 'montreal', 'fest', 1980, 0, 'Festival International de Jazz de Montréal', 'Festival de Jazz de Montrealzinho', ''),
P('mtl_forum', 'montreal', 'arena', 1924, 1996, 'Montreal Forum', 'Montreal Fórum Velho', ''),
P('mtl_metropolis', 'montreal', 'venue', 1987, 0, 'Métropolis (MTELUS)', 'Metrópole', 'v'),
P('mtl_place_des_arts', 'montreal', 'theatre', 1963, 0, 'Place des Arts', 'Place des Artes', ''),
P('mtl_cbf', 'montreal', 'radio', 1937, 0, 'Radio-Canada (CBF)', 'Rádio-Canadinha', 'v'),
// Cleveland
P('clev_wmms', 'cleveland', 'radio', 1968, 0, 'WMMS', 'WMMZ', 'v'),
P('clev_agora', 'cleveland', 'venue', 1966, 0, 'Agora Theatre', 'Ágora Teatrinho', 'v'),
P('clev_severance', 'cleveland', 'theatre', 1931, 0, 'Severance Hall', 'Severence Hall', ''),
P('clev_record_rev', 'cleveland', 'store', 1971, 0, 'Record Revolution', 'Disco Revolution', 'v'),
P('clev_arena', 'cleveland', 'arena', 1937, 1977, 'Cleveland Arena', 'Cleveland Arenazinha', 'v'),
// Boston
P('bos_symphony', 'boston', 'theatre', 1900, 0, 'Symphony Hall', 'Sinfonia Hall', 'lm:bos_symphony'),
P('bos_paradise', 'boston', 'venue', 1977, 0, 'Paradise Rock Club', 'Paraíso Rock Club', 'v'),
P('bos_wbcn', 'boston', 'radio', 1968, 2009, 'WBCN', 'WBCM', ''),
P('bos_boston_garden', 'boston', 'arena', 1928, 1998, 'Boston Garden', 'Boston Jardim', ''),
P('bos_club_47', 'boston', 'bar', 1958, 0, 'Club 47 (Club Passim)', 'Club 48', 'v'),
// Washington
P('dc_930', 'washington', 'venue', 1980, 0, '9:30 Club', '9:45 Club', ''),
P('dc_howard', 'washington', 'theatre', 1910, 0, 'Howard Theatre', 'Howie Theatre', 'v'),
P('dc_dischord', 'washington', 'label', 1980, 0, 'Dischord Records', 'Discórdia Records', ''),
P('dc_kennedy', 'washington', 'theatre', 1971, 0, 'Kennedy Center', 'Kennedinho Center', ''),
P('dc_wpfw', 'washington', 'radio', 1977, 0, 'WPFW', 'WPFV', 'v'),
// Las Vegas
P('lv_sands', 'las_vegas', 'theatre', 1952, 1996, 'Sands (Copa Room)', 'Areias (Copa Room)', ''),
P('lv_international', 'las_vegas', 'theatre', 1969, 0, 'International Hotel (Westgate)', 'Internacionalzinho Hotel', 'v'),
P('lv_caesars', 'las_vegas', 'theatre', 2003, 0, 'The Colosseum at Caesars Palace', 'The Coliseuzinho at César Palace', ''),
P('lv_edc', 'las_vegas', 'fest', 2011, 0, 'EDC (Las Vegas Motor Speedway)', 'EDS (Vegas Motor Pista)', 'v'),
P('lv_sphere', 'las_vegas', 'arena', 2023, 0, 'Sphere', 'Esfera', ''),
// Madri
P('mad_real', 'madrid', 'theatre', 1850, 0, 'Teatro Real', 'Teatro Realito', ''),
P('mad_rne', 'madrid', 'radio', 1937, 0, 'Radio Nacional de España', 'Radio Nacionalita de España', ''),
P('mad_tve', 'madrid', 'tv', 1956, 0, 'TVE', 'TVÉ', ''),
P('mad_rock_ola', 'madrid', 'venue', 1981, 1985, 'Rock-Ola', 'Rock-Cola', 'v'),
P('mad_las_ventas', 'madrid', 'arena', 1931, 0, 'Las Ventas', 'Las Ventanas', ''),
P('mad_sala_el_sol', 'madrid', 'venue', 1979, 0, 'Sala El Sol', 'Sala La Luna', 'v'),
// Barcelona
P('bcn_palau', 'barcelona', 'theatre', 1908, 0, 'Palau de la Música Catalana', 'Palauzinho de la Música', 'lm:bcn_palau'),
P('bcn_liceu', 'barcelona', 'theatre', 1847, 0, 'Gran Teatre del Liceu', 'Gran Teatre del Liceuzinho', ''),
P('bcn_razzmatazz', 'barcelona', 'venue', 2000, 0, 'Razzmatazz', 'Jazzmatazz', ''),
P('bcn_primavera', 'barcelona', 'fest', 2001, 0, 'Primavera Sound (Parc del Fòrum)', 'Outono Sound', ''),
P('bcn_apolo', 'barcelona', 'venue', 1943, 0, 'Sala Apolo', 'Sala Apolinho', 'v'),
// Roma
P('rom_rai', 'rome', 'tv', 1954, 0, 'RAI', 'RAE', ''),
P('rom_rca_italiana', 'rome', 'label', 1951, 1987, 'RCA Italiana', 'RCB Italiana', 'v'),
P('rom_piper', 'rome', 'venue', 1965, 0, 'Piper Club', 'Pífaro Club', ''),
P('rom_olimpico', 'rome', 'arena', 1953, 0, 'Stadio Olimpico', 'Stadio Olimpiquinho', ''),
P('rom_auditorium', 'rome', 'theatre', 2002, 0, 'Auditorium Parco della Musica', 'Auditorium Parco della Musichetta', ''),
P('rom_folkstudio', 'rome', 'bar', 1961, 1998, 'Folkstudio', 'Folkestúdio', 'v'),
// Amsterdã
P('ams_concert', 'amsterdam', 'theatre', 1888, 0, 'Concertgebouw', 'Concertgebauw', 'lm:ams_concert'),
P('ams_paradiso', 'amsterdam', 'venue', 1968, 0, 'Paradiso', 'Paraisinho', ''),
P('ams_melkweg', 'amsterdam', 'venue', 1970, 0, 'Melkweg', 'Melkpad', ''),
P('ams_ziggo', 'amsterdam', 'arena', 2012, 0, 'Ziggo Dome', 'Zaggo Dome', ''),
P('ams_concerto', 'amsterdam', 'store', 1958, 0, 'Concerto', 'Concertinho', 'v'),
// Viena
P('vie_musikverein', 'vienna', 'theatre', 1870, 0, 'Musikverein', 'Musikvereinchen', 'lm:vie_musikverein'),
P('vie_staatsoper', 'vienna', 'theatre', 1869, 0, 'Staatsoper', 'Staatsoperette', ''),
P('vie_konzerthaus', 'vienna', 'theatre', 1913, 0, 'Konzerthaus', 'Konzerthäuschen', ''),
P('vie_orf', 'vienna', 'radio', 1924, 0, 'RAVAG / ORF', 'RAVAJ / ORV', 'v'),
P('vie_arena', 'vienna', 'venue', 1976, 0, 'Arena Wien', 'Arenazinha Wien', 'v'),
// Moscou
P('mos_bolshoi', 'moscow', 'theatre', 1825, 0, 'Teatro Bolshoi', 'Teatro Bolshinho', ''),
P('mos_melodiya', 'moscow', 'label', 1964, 0, 'Melodiya', 'Melodinha', ''),
P('mos_tchaikovsky', 'moscow', 'theatre', 1940, 0, 'Sala de Concertos Tchaikovsky', 'Sala de Concertos Tchaikovskinho', 'v'),
P('mos_luzhniki', 'moscow', 'arena', 1956, 0, 'Estádio Luzhniki', 'Estádio Luzinhiki', ''),
P('mos_radio_moscou', 'moscow', 'radio', 1924, 0, 'Rádio de Moscou', 'Rádio de Moscouzinho', 'v'),
// Glasgow
P('gla_barrowland', 'glasgow', 'venue', 1934, 0, 'Barrowland Ballroom', 'Wheelbarrowland Ballroom', ''),
P('gla_king_tuts', 'glasgow', 'bar', 1990, 0, 'King Tut\'s Wah Wah Hut', 'Queen Tut\'s Wah Wah Hut', ''),
P('gla_apollo', 'glasgow', 'venue', 1973, 1985, 'Glasgow Apollo', 'Glasgow Apolinho', ''),
P('gla_bbc_scotland', 'glasgow', 'radio', 1923, 0, 'BBC Scotland', 'BBC Escócia', 'v'),
P('gla_postcard', 'glasgow', 'label', 1979, 1981, 'Postcard Records', 'Cartão-Postal Records', 'v'),
// Bristol
P('bri_colston_hall', 'bristol', 'theatre', 1867, 0, 'Colston Hall (Bristol Beacon)', 'Bristol Farol Hall', ''),
P('bri_thekla', 'bristol', 'venue', 1984, 0, 'Thekla', 'Thekula', 'v'),
P('bri_dug_out', 'bristol', 'bar', 1970, 1987, 'The Dug Out', 'The Dig In', 'v'),
P('bri_wild_bunch_studio', 'bristol', 'studio', 1980, 0, 'Coach House Studios', 'Carriage House Studios', 'v'),
// Birmingham
P('bham_town_hall', 'birmingham', 'theatre', 1834, 0, 'Birmingham Town Hall', 'Birmingham City Hallzinho', ''),
P('bham_odeon', 'birmingham', 'theatre', 1937, 0, 'Birmingham Odeon', 'Birmingham Odeonzinho', 'v'),
P('bham_nec', 'birmingham', 'arena', 1980, 0, 'NEC Arena', 'NEB Arena', ''),
P('bham_barbarellas', 'birmingham', 'venue', 1972, 1979, 'Barbarella\'s', 'Barbarinha\'s', 'v'),
P('bham_mothers', 'birmingham', 'venue', 1968, 1971, 'Mothers', 'Fathers', 'v'),
// Hamburgo
P('ham_star_club', 'hamburg', 'venue', 1962, 1969, 'Star-Club', 'Estrela-Club', 'u'),
P('ham_kaiserkeller', 'hamburg', 'bar', 1959, 0, 'Kaiserkeller', 'Königkeller', 'v'),
P('ham_indra', 'hamburg', 'bar', 1960, 0, 'Indra', 'Indira', 'v'),
P('ham_ndr', 'hamburg', 'radio', 1924, 0, 'NDR (NORAG)', 'NDS', 'v'),
P('ham_laeiszhalle', 'hamburg', 'theatre', 1908, 0, 'Laeiszhalle', 'Leisehalle', ''),
P('ham_elbphilharmonie', 'hamburg', 'theatre', 2017, 0, 'Elbphilharmonie', 'Elbphilarmoninha', ''),
// Osaka
P('osa_festival_hall', 'osaka', 'theatre', 1958, 0, 'Festival Hall', 'Festança Hall', ''),
P('osa_castle_hall', 'osaka', 'arena', 1983, 0, 'Osaka-jō Hall', 'Osaka Castelinho Hall', ''),
P('osa_mbs', 'osaka', 'radio', 1951, 0, 'MBS Rádio', 'MBZ Rádio', 'v'),
P('osa_kyocera_dome', 'osaka', 'arena', 1997, 0, 'Osaka Dome', 'Osaka Domo', ''),
// Santiago
P('scl_municipal', 'santiago', 'theatre', 1857, 0, 'Teatro Municipal de Santiago', 'Teatro Municipalito de Santiago', ''),
P('scl_estadio_nacional', 'santiago', 'arena', 1938, 0, 'Estadio Nacional', 'Estadio Nacionalito', ''),
P('scl_caupolican', 'santiago', 'theatre', 1936, 0, 'Teatro Caupolicán', 'Teatro Caupolicanzinho', 'v'),
P('scl_pena_parra', 'santiago', 'bar', 1965, 1973, 'Peña de los Parra', 'Peña de los Parrales', 'v'),
P('scl_radio_cooperativa', 'santiago', 'radio', 1935, 0, 'Radio Cooperativa', 'Radio Cooperativita', ''),
// Lima
P('lim_radio_nacional', 'lima', 'radio', 1937, 0, 'Radio Nacional del Perú', 'Radio Nacionalita del Perú', 'v'),
P('lim_municipal', 'lima', 'theatre', 1920, 0, 'Teatro Municipal de Lima', 'Teatro Municipalito de Lima', 'v'),
P('lim_iempsa', 'lima', 'label', 1949, 0, 'IEMPSA', 'IEMPSO', 'v'),
P('lim_america_tv', 'lima', 'tv', 1958, 0, 'América Televisión', 'Américo Televisión', ''),
// Medellín
P('med_codiscos', 'medellin', 'label', 1950, 0, 'Codiscos', 'Codisquinhos', 'v'),
P('med_discos_fuentes', 'medellin', 'label', 1934, 0, 'Discos Fuentes', 'Discos Fontes', 'v'),
P('med_atanasio', 'medellin', 'arena', 1953, 0, 'Estadio Atanasio Girardot', 'Estadio Atanásio Girafot', ''),
P('med_teatro_pablo_tobon', 'medellin', 'theatre', 1967, 0, 'Teatro Pablo Tobón Uribe', 'Teatro Pablito Tobón', 'v'),
// San Juan
P('sju_wkaq', 'san_juan', 'radio', 1922, 0, 'WKAQ', 'WKAK', ''),
P('sju_choli', 'san_juan', 'arena', 2004, 0, 'Coliseo de Puerto Rico (El Choli)', 'Coliseo de Porto Rico (El Cholito)', ''),
P('sju_bellas_artes', 'san_juan', 'theatre', 1981, 0, 'Centro de Bellas Artes', 'Centro de Bellas Artecitas', ''),
P('sju_tapia', 'san_juan', 'theatre', 1832, 0, 'Teatro Tapia', 'Teatro Tapinha', ''),
// Manaus
P('manaus_teatro_amazonas', 'manaus', 'theatre', 1896, 0, 'Teatro Amazonas', 'Teatro Amazonense', ''),
P('manaus_radio_difusora', 'manaus', 'radio', 1948, 0, 'Rádio Difusora do Amazonas', 'Rádio Difundida do Amazonas', 'v'),
// Florianópolis
P('florianopolis_tac', 'florianopolis', 'theatre', 1875, 0, 'Teatro Álvaro de Carvalho', 'Teatro Álvaro de Cravo', ''),
P('florianopolis_ric_tv', 'florianopolis', 'tv', 1979, 0, 'RBS TV Florianópolis', 'RBX TV Florianópolis', 'v'),
// São Luís
P('sao_luis_arthur_azevedo', 'sao_luis', 'theatre', 1817, 0, 'Teatro Arthur Azevedo', 'Teatro Artur Azulado', ''),
P('sao_luis_radio_timbira', 'sao_luis', 'radio', 1941, 0, 'Rádio Timbira', 'Rádio Timbiriba', 'v'),
// Campinas
P('campinas_carlos_gomes', 'campinas', 'theatre', 1930, 1966, 'Teatro Municipal Carlos Gomes', 'Teatro Municipal Carlos Gols', 'v'),
P('campinas_eptv', 'campinas', 'tv', 1979, 0, 'EPTV Campinas', 'EPVT Campinas', ''),
// Vancouver
P('vancouver_commodore', 'vancouver', 'venue', 1929, 0, 'Commodore Ballroom', 'Commodious Ballroom', ''),
P('vancouver_orpheum', 'vancouver', 'theatre', 1927, 0, 'Orpheum Theatre', 'Orpheus Theatre', ''),
P('vancouver_little_mountain', 'vancouver', 'studio', 1980, 2000, 'Little Mountain Sound', 'Little Molehill Sound', 'v'),
// Minneapolis
P('minneapolis_first_avenue', 'minneapolis', 'venue', 1970, 0, 'First Avenue', 'First Alley', ''),
P('minneapolis_paisley_park', 'minneapolis', 'studio', 1987, 0, 'Paisley Park', 'Plaid Park', 'v'),
// Houston
P('houston_astrodome', 'houston', 'arena', 1965, 2009, 'Astrodome', 'Astrodomo', 'v'),
P('houston_sugarhill', 'houston', 'studio', 1941, 0, 'SugarHill Studios', 'SyrupHill Studios', 'v'),
// Kansas City
P('kansas_city_reno_club', 'kansas_city', 'bar', 1932, 1949, 'Reno Club', 'Reno Pub', 'v'),
P('kansas_city_folly', 'kansas_city', 'theatre', 1900, 0, 'Folly Theater', 'Jolly Theater', 'v'),
// Honolulu
P('honolulu_hawaii_theatre', 'honolulu', 'theatre', 1922, 0, 'Hawaii Theatre', 'Hawaii Teatrinho', ''),
P('honolulu_hic', 'honolulu', 'arena', 1964, 0, 'Neal S. Blaisdell Center', 'Neal S. Blaisdale Center', ''),
// Caracas
P('caracas_teresa_carreno', 'caracas', 'theatre', 1983, 0, 'Teatro Teresa Carreño', 'Teatro Teresa Carroña', ''),
P('caracas_radio_caracas', 'caracas', 'radio', 1930, 0, 'Radio Caracas Radio', 'Radio Caraquinhas Radio', 'v'),
P('caracas_rctv', 'caracas', 'tv', 1953, 2007, 'RCTV', 'RCVT', ''),
// Monterrey
P('monterrey_arena', 'monterrey', 'arena', 2003, 0, 'Arena Monterrey', 'Arena Monterrei', ''),
P('monterrey_auditorio_banamex', 'monterrey', 'venue', 1994, 0, 'Auditorio Citibanamex', 'Auditorio Citibananex', 'v'),
// Guadalajara
P('guadalajara_degollado', 'guadalajara', 'theatre', 1866, 0, 'Teatro Degollado', 'Teatro Degolado', ''),
P('guadalajara_auditorio_telmex', 'guadalajara', 'venue', 2007, 0, 'Auditorio Telmex', 'Auditorio Telmix', ''),
// Montevideo
P('montevideo_solis', 'montevideo', 'theatre', 1856, 0, 'Teatro Solís', 'Teatro Solzinho', ''),
P('montevideo_sodre', 'montevideo', 'radio', 1929, 0, 'Radio SODRE', 'Radio SOPRE', 'v'),
// Panamá
P('panama_teatro_nacional', 'panama', 'theatre', 1908, 0, 'Teatro Nacional de Panamá', 'Teatro Nacionalzinho de Panamá', ''),
// Santo Domingo
P('santo_domingo_teatro_nacional', 'santo_domingo', 'theatre', 1973, 0, 'Teatro Nacional Eduardo Brito', 'Teatro Nacional Eduardo Bonito', ''),
P('santo_domingo_hispaniola', 'santo_domingo', 'bar', 1960, 0, 'Hotel Jaragua (salón de merengue)', 'Hotel Jaraguá (salão de merengue)', 'v'),
// Port of Spain
P('port_of_spain_savannah', 'port_of_spain', 'fest', 1950, 0, 'Queen\'s Park Savannah (Panorama)', 'Queen\'s Park Savana (Panorama)', 'v'),
P('port_of_spain_radio_trinidad', 'port_of_spain', 'radio', 1947, 0, 'Radio Trinidad', 'Radio Trindade', 'v'),
// Cartagena
P('cartagena_discos_fuentes', 'cartagena', 'label', 1934, 1954, 'Discos Fuentes', 'Discos Fontes', 'v'),
P('cartagena_heredia', 'cartagena', 'theatre', 1911, 0, 'Teatro Heredia', 'Teatro Herédio', 'v'),
// Port-au-Prince
P('port_au_prince_radio_haiti', 'port_au_prince', 'radio', 1935, 2003, 'Radio Haïti-Inter', 'Radio Haïti-Intra', 'v'),
P('port_au_prince_rex', 'port_au_prince', 'theatre', 1935, 2010, 'Rex Théâtre', 'Rei Théâtre', 'v'),
// Pointe-à-Pitre
P('pointe_a_pitre_rci', 'pointe_a_pitre', 'radio', 1962, 0, 'Radio Caraïbes Internationale', 'Radio Caraïbes Intercontinentale', 'v'),
// Cali
P('cali_teatro_municipal', 'cali', 'theatre', 1927, 0, 'Teatro Municipal Enrique Buenaventura', 'Teatro Municipal Enrique Boaventura', 'v'),
P('cali_juanchito', 'cali', 'bar', 1970, 0, 'Juanchito (salsotecas)', 'Juanzito (salsotecas)', 'v'),
// Sevilla
P('sevilla_maestranza', 'sevilla', 'theatre', 1991, 0, 'Teatro de la Maestranza', 'Teatro de la Mestrança', ''),
P('sevilla_lope_de_vega', 'sevilla', 'theatre', 1929, 0, 'Teatro Lope de Vega', 'Teatro Lope de Veja', ''),
// Ibiza
P('ibiza_amnesia', 'ibiza', 'venue', 1976, 0, 'Amnesia', 'Amnésica', ''),
P('ibiza_ku_privilege', 'ibiza', 'venue', 1978, 0, 'Ku / Privilege', 'Kú / Privilégio', 'v'),
P('ibiza_pacha', 'ibiza', 'venue', 1973, 0, 'Pacha', 'Pachá-Chá', ''),
// Naples
P('naples_san_carlo', 'naples', 'theatre', 1737, 0, 'Teatro di San Carlo', 'Teatro di San Carletto', ''),
P('naples_piedigrotta', 'naples', 'fest', 1835, 1982, 'Festa di Piedigrotta', 'Festa di Piedigrottina', 'v'),
// Rotterdam
P('rotterdam_ahoy', 'rotterdam', 'arena', 1971, 0, 'Ahoy Rotterdam', 'Ahoi Rotterdam', ''),
P('rotterdam_de_doelen', 'rotterdam', 'theatre', 1966, 0, 'De Doelen', 'De Doelinhos', ''),
// Brussels
P('brussels_ancienne_belgique', 'brussels', 'venue', 1913, 0, 'Ancienne Belgique', 'Antiga Belgique', 'v'),
P('brussels_bozar', 'brussels', 'theatre', 1928, 0, 'Palais des Beaux-Arts (Bozar)', 'Palais des Beaux-Ares (Bozart)', ''),
P('brussels_forest_national', 'brussels', 'arena', 1970, 0, 'Forest National', 'Floresta National', ''),
// Prague
P('prague_rudolfinum', 'prague', 'theatre', 1885, 0, 'Rudolfinum', 'Rudolfininho', ''),
P('prague_lucerna', 'prague', 'venue', 1909, 0, 'Lucerna Music Bar', 'Lanterna Music Bar', 'v'),
// Warsaw
P('warsaw_polskie_radio', 'warsaw', 'radio', 1926, 0, 'Polskie Radio', 'Polskie Rádio Rádio', ''),
P('warsaw_filharmonia', 'warsaw', 'theatre', 1901, 0, 'Filharmonia Narodowa', 'Filharmonia Narodinha', ''),
// Budapest
P('budapest_opera', 'budapest', 'theatre', 1884, 0, 'Magyar Állami Operaház', 'Magyar Operaházinho', ''),
P('budapest_sziget', 'budapest', 'fest', 1993, 0, 'Sziget Festival (Óbudai-sziget)', 'Szigetinho Festival (Óbudai-sziget)', ''),
// St. Petersburg
P('st_petersburg_mariinsky', 'st_petersburg', 'theatre', 1860, 0, 'Mariinsky Theatre', 'Marinsky Theatrinho', ''),
P('st_petersburg_rock_club', 'st_petersburg', 'venue', 1981, 1991, 'Leningrad Rock Club', 'Leningrad Roque Club', 'v'),
P('st_petersburg_melodiya', 'st_petersburg', 'studio', 1964, 1992, 'Melodiya (Leningrad studio)', 'Melodinha (Leningrad studio)', 'v'),
// Kyiv
P('kyiv_opera', 'kyiv', 'theatre', 1901, 0, 'National Opera of Ukraine', 'National Operazinha of Ukraine', ''),
P('kyiv_palace_ukraina', 'kyiv', 'venue', 1970, 0, 'Palace Ukraina', 'Palácio Ucraninha', ''),
// Belgrade
P('belgrade_radio_beograd', 'belgrade', 'radio', 1929, 0, 'Radio Beograd', 'Radio Beogrado', ''),
P('belgrade_dom_omladine', 'belgrade', 'venue', 1964, 0, 'Dom Omladine', 'Dom Omladinho', 'v'),
// Athens
P('athens_odeon_herodes', 'athens', 'theatre', 161, 0, 'Odeon of Herodes Atticus', 'Odeon of Herodes Ático', ''),
P('athens_megaron', 'athens', 'theatre', 1991, 0, 'Megaron Mousikis', 'Megaron Musiquinha', ''),
// Copenhagen
P('copenhagen_tivoli', 'copenhagen', 'venue', 1843, 0, 'Tivoli Gardens (Koncertsal)', 'Tivolli Gardens (Koncertsal)', ''),
P('copenhagen_vega', 'copenhagen', 'venue', 1996, 0, 'VEGA', 'VEGANA', ''),
P('copenhagen_montmartre', 'copenhagen', 'bar', 1959, 1995, 'Jazzhus Montmartre', 'Jazzhus Montmartrinho', 'v'),
// Oslo
P('oslo_nrk', 'oslo', 'tv', 1933, 0, 'NRK (Marienlyst)', 'NRQ (Marienlyst)', ''),
P('oslo_rainbow_studio', 'oslo', 'studio', 1984, 0, 'Rainbow Studio', 'Arco-Íris Studio', 'v'),
// Helsinki
P('helsinki_yle', 'helsinki', 'radio', 1926, 0, 'Yle Radio', 'Ylle Radio', ''),
P('helsinki_tavastia', 'helsinki', 'venue', 1970, 0, 'Tavastia Club', 'Tavastinha Club', ''),
// Reykjavík
P('reykjavik_harpa', 'reykjavik', 'theatre', 2011, 0, 'Harpa', 'Harpinha', ''),
P('reykjavik_sundlaugin', 'reykjavik', 'studio', 1999, 0, 'Sundlaugin Studio', 'Sundlaugzinha Studio', 'v'),
// Sheffield
P('sheffield_leadmill', 'sheffield', 'venue', 1980, 0, 'The Leadmill', 'The Leadmilho', ''),
P('sheffield_city_hall', 'sheffield', 'theatre', 1932, 0, 'Sheffield City Hall', 'Sheffield Town Hall', ''),
// Munich
P('munich_musicland', 'munich', 'studio', 1969, 1993, 'Musicland Studios', 'Musiclândia Studios', 'v'),
P('munich_olympiahalle', 'munich', 'arena', 1972, 0, 'Olympiahalle', 'Olympiahallinha', ''),
P('munich_br', 'munich', 'radio', 1949, 0, 'Bayerischer Rundfunk', 'Bayerischer Rundfunkinho', ''),
// Cologne
P('cologne_wdr', 'cologne', 'radio', 1956, 0, 'WDR (Westdeutscher Rundfunk)', 'WDZ (Westdeutscher Rundfunkinho)', ''),
P('cologne_conny_plank', 'cologne', 'studio', 1974, 1987, 'Conny\'s Studio', 'Conny\'s Estudinho', 'v'),
P('cologne_philharmonie', 'cologne', 'theatre', 1986, 0, 'Kölner Philharmonie', 'Kölner Philharmoninha', ''),
// Marseille
P('marseille_opera', 'marseille', 'theatre', 1924, 0, 'Opéra de Marseille', 'Opérette de Marseille', ''),
P('marseille_dome', 'marseille', 'arena', 1994, 0, 'Le Dôme', 'Le Domo', ''),
// Porto
P('porto_coliseu', 'porto', 'venue', 1941, 0, 'Coliseu do Porto', 'Coliseuzinho do Porto', ''),
P('porto_casa_da_musica', 'porto', 'theatre', 2005, 0, 'Casa da Música', 'Casa da Musiquinha', ''),
// Shanghai
P('shanghai_paramount', 'shanghai', 'venue', 1933, 0, 'Paramount Ballroom (Bai Le Men)', 'Paramontanha Ballroom (Bai Le Men)', 'v'),
P('shanghai_pathe', 'shanghai', 'label', 1908, 1949, 'Pathé Orient (EMI Shanghai)', 'Pathê Oriente (EMI Shanghai)', 'v'),
P('shanghai_grand_theatre', 'shanghai', 'theatre', 1998, 0, 'Shanghai Grand Theatre', 'Shanghai Grandioso Theatre', ''),
// Beijing
P('beijing_workers_stadium', 'beijing', 'arena', 1959, 0, 'Workers\' Stadium', 'Workers\' Estadinho', ''),
P('beijing_cctv', 'beijing', 'tv', 1958, 0, 'CCTV', 'CCVT', ''),
P('beijing_mao_livehouse', 'beijing', 'venue', 2007, 0, 'MAO Livehouse', 'MIAU Livehouse', 'v'),
// Taipei
P('taipei_legacy', 'taipei', 'venue', 2009, 0, 'Legacy Taipei', 'Legado Taipei', 'v'),
P('taipei_arena', 'taipei', 'arena', 2005, 0, 'Taipei Arena', 'Taipei Arenazinha', ''),
// Manila
P('manila_araneta', 'manila', 'arena', 1960, 0, 'Araneta Coliseum', 'Aranhota Coliseum', ''),
P('manila_ccp', 'manila', 'theatre', 1969, 0, 'Cultural Center of the Philippines', 'Cultural Centrinho of the Philippines', ''),
// Jakarta
P('jakarta_rri', 'jakarta', 'radio', 1945, 0, 'RRI (Radio Republik Indonesia)', 'RRY (Rádio Republik Indonesia)', ''),
P('jakarta_istora', 'jakarta', 'arena', 1962, 0, 'Istora Senayan', 'Istória Senayan', ''),
// Singapore
P('singapore_esplanade', 'singapore', 'theatre', 2002, 0, 'Esplanade – Theatres on the Bay', 'Esplanadinha – Theatres on the Bay', ''),
P('singapore_victoria', 'singapore', 'theatre', 1862, 0, 'Victoria Theatre and Concert Hall', 'Vitória Theatre and Concert Hall', ''),
// Kuala Lumpur
P('kuala_lumpur_rtm', 'kuala_lumpur', 'radio', 1946, 0, 'RTM (Radio Televisyen Malaysia)', 'RTN (Rádio Televisyen Malaysia)', 'v'),
P('kuala_lumpur_stadium_merdeka', 'kuala_lumpur', 'arena', 1957, 0, 'Stadium Merdeka', 'Stadium Merdekinha', ''),
// Ho Chi Minh City
P('ho_chi_minh_opera', 'ho_chi_minh', 'theatre', 1900, 0, 'Saigon Opera House', 'Saigon Operazinha', ''),
P('ho_chi_minh_rex', 'ho_chi_minh', 'bar', 1959, 0, 'Rex Hotel (rooftop bar)', 'Rei Hotel (rooftop bar)', 'v'),
// Delhi
P('delhi_air', 'delhi', 'radio', 1936, 0, 'All India Radio (Akashvani Bhavan)', 'All India Rádio (Akashvani Bhavanzinho)', ''),
P('delhi_doordarshan', 'delhi', 'tv', 1959, 0, 'Doordarshan', 'Doordarshinho', ''),
P('delhi_siri_fort', 'delhi', 'theatre', 1982, 0, 'Siri Fort Auditorium', 'Siri Forte Auditorium', ''),
// Kolkata
P('kolkata_hmv_dum_dum', 'kolkata', 'label', 1908, 0, 'Gramophone Company / HMV (Dum Dum)', 'Gramofone Company / HMB (Dum Dum)', 'v'),
P('kolkata_trincas', 'kolkata', 'bar', 1959, 0, 'Trincas (Park Street)', 'Trincos (Park Street)', 'v'),
// Chennai
P('chennai_music_academy', 'chennai', 'theatre', 1928, 0, 'Madras Music Academy', 'Madras Music Academinha', ''),
P('chennai_avm', 'chennai', 'studio', 1945, 0, 'AVM Studios', 'AVN Studios', 'v'),
// Karachi
P('karachi_radio_pakistan', 'karachi', 'radio', 1948, 0, 'Radio Pakistan Karachi', 'Rádio Pakistanzinho Karachi', 'v'),
P('karachi_ptv', 'karachi', 'tv', 1967, 0, 'PTV Karachi', 'PVT Karachi', 'v'),
// Lahore
P('lahore_alhamra', 'lahore', 'theatre', 1979, 0, 'Alhamra Arts Council', 'Alhambrinha Arts Council', 'v'),
P('lahore_radio_pakistan', 'lahore', 'radio', 1937, 0, 'Radio Pakistan Lahore', 'Rádio Pakistanzinho Lahore', 'v'),
// Tehran
P('tehran_vahdat', 'tehran', 'theatre', 1967, 0, 'Vahdat Hall (Talar Rudaki)', 'Vahdatinho Hall (Talar Rudaki)', ''),
P('tehran_radio_tehran', 'tehran', 'radio', 1940, 0, 'Radio Tehran', 'Rádio Teerãzinho', 'v'),
// Tel Aviv
P('tel_aviv_mann', 'tel_aviv', 'theatre', 1957, 0, 'Charles Bronfman Auditorium (Mann)', 'Charles Bronze Auditorium (Mann)', ''),
P('tel_aviv_barby', 'tel_aviv', 'venue', 1996, 0, 'Barby Club', 'Barbie Club', 'v'),
// Dubai
P('dubai_opera', 'dubai', 'theatre', 2016, 0, 'Dubai Opera', 'Dubai Operinha', ''),
P('dubai_coca_cola_arena', 'dubai', 'arena', 2019, 0, 'Coca-Cola Arena', 'Coco-Cola Arena', ''),
// Busan
P('busan_kbs_hall', 'busan', 'theatre', 1990, 0, 'KBS Busan Hall', 'KBZ Busan Hall', 'v'),
P('busan_bexco', 'busan', 'arena', 2001, 0, 'BEXCO', 'BEXCÔ', ''),
// Accra
P('accra_gbc', 'accra', 'radio', 1935, 0, 'Ghana Broadcasting Corporation', 'Ghana Broadcasting Corporaçãozinha', 'v'),
P('accra_ambassador', 'accra', 'bar', 1957, 0, 'Ambassador Hotel (highlife nights)', 'Embaixador Hotel (highlife nights)', 'v'),
// Nairobi
P('nairobi_kbc', 'nairobi', 'radio', 1928, 0, 'Voice of Kenya / KBC', 'Voz do Quênia / KBZ', 'v'),
P('nairobi_carnivore', 'nairobi', 'venue', 1980, 0, 'Carnivore (Simba Saloon)', 'Carnívoro (Simba Saloon)', 'v'),
// Kinshasa
P('kinshasa_ngoma', 'kinshasa', 'label', 1948, 1970, 'Éditions Ngoma', 'Éditions Ngomba', 'v'),
P('kinshasa_vis_a_vis', 'kinshasa', 'bar', 1950, 0, 'Vis-à-Vis (Matonge)', 'Cara-a-Cara (Matonge)', 'v'),
// Addis Ababa
P('addis_ababa_national_theatre', 'addis_ababa', 'theatre', 1955, 0, 'Ethiopian National Theatre', 'Ethiopian Nacionalzinho Theatre', ''),
P('addis_ababa_amha_records', 'addis_ababa', 'label', 1969, 1975, 'Amha Records', 'Amba Records', 'v'),
// Abidjan
P('abidjan_rti', 'abidjan', 'tv', 1963, 0, 'RTI (Radiodiffusion Télévision Ivoirienne)', 'RTY (Radiodiffusion Télévision Ivoirinha)', ''),
P('abidjan_palais_culture', 'abidjan', 'theatre', 1999, 0, 'Palais de la Culture de Treichville', 'Palácio de la Culture de Treichville', 'v'),
// Bamako
P('bamako_ortm', 'bamako', 'radio', 1957, 0, 'ORTM (Radio Mali)', 'ORTN (Rádio Mali)', 'v'),
P('bamako_hogon', 'bamako', 'bar', 1990, 2010, 'Le Hogon', 'Le Hogonzinho', 'v'),
// Luanda
P('luanda_rna', 'luanda', 'radio', 1977, 0, 'Rádio Nacional de Angola', 'Rádio Nacionalzinha de Angola', ''),
P('luanda_elinga', 'luanda', 'theatre', 1988, 0, 'Elinga Teatro', 'Elingo Teatro', 'v'),
// Maputo
P('maputo_radio_mocambique', 'maputo', 'radio', 1975, 0, 'Rádio Moçambique', 'Rádio Moçambiquinho', ''),
P('maputo_gil_vicente', 'maputo', 'bar', 1933, 0, 'Gil Vicente Café-Bar', 'Gil Vicentinho Café-Bar', 'v'),
// Cape Town
P('cape_town_city_hall', 'cape_town', 'theatre', 1905, 0, 'Cape Town City Hall', 'Cape Town Town Hall', ''),
P('cape_town_kirstenbosch', 'cape_town', 'fest', 1992, 0, 'Kirstenbosch Summer Concerts', 'Kirstenbushy Summer Concerts', 'v'),
P('cape_town_jazz_fest', 'cape_town', 'fest', 2000, 0, 'Cape Town International Jazz Festival (CTICC)', 'Cape Town Intercontinental Jazz Festival (CTICC)', 'v'),
// Durban
P('durban_bat_centre', 'durban', 'venue', 1995, 0, 'BAT Centre', 'BAT Centrinho', 'v'),
P('durban_playhouse', 'durban', 'theatre', 1935, 0, 'Playhouse Company (Durban)', 'Playhut Company (Durban)', 'v'),
// Harare
P('harare_hicc', 'harare', 'venue', 1986, 0, 'Harare International Conference Centre', 'Harare Intercontinental Conference Centre', ''),
P('harare_zbc', 'harare', 'radio', 1957, 0, 'ZBC Radio', 'ZBZ Radio', 'v'),
// Casablanca
P('casablanca_rialto', 'casablanca', 'theatre', 1930, 0, 'Cinéma Rialto', 'Cinéma Rialtinho', 'v'),
P('casablanca_boulevard', 'casablanca', 'fest', 1999, 0, 'L\'Boulevard Festival', 'L\'Bulevar Festival', 'v'),
// Algiers
P('algiers_opera', 'algiers', 'theatre', 1853, 0, 'Théâtre National Algérien Mahieddine Bachtarzi', 'Théâtre National Algérien Mahieddine Bachtarzinho', 'v'),
P('algiers_radio', 'algiers', 'radio', 1929, 0, 'Radio Alger (Chaîne 1)', 'Rádio Algerzinho (Chaîne 1)', 'v'),
// Oran
P('oran_theatre', 'oran', 'theatre', 1907, 0, 'Théâtre Régional d\'Oran', 'Théâtre Regionalzinho d\'Oran', 'v'),
P('oran_disco_maghreb', 'oran', 'store', 1972, 0, 'Disco Maghreb', 'Disco Magrebinho', 'v'),
// Tunis
P('tunis_theatre_municipal', 'tunis', 'theatre', 1902, 0, 'Théâtre Municipal de Tunis', 'Théâtre Municipalzinho de Tunis', ''),
P('tunis_carthage', 'tunis', 'fest', 1964, 0, 'Festival International de Carthage', 'Festival Intercontinental de Carthage', ''),
// Dar es Salaam
P('dar_es_salaam_rtd', 'dar_es_salaam', 'radio', 1951, 0, 'Radio Tanzania Dar es Salaam', 'Rádio Tanzaninha Dar es Salaam', 'v'),
P('dar_es_salaam_diamond_jubilee', 'dar_es_salaam', 'arena', 1960, 0, 'Diamond Jubilee Hall', 'Diamante Jubilee Hall', 'v'),
// Zanzibar
P('zanzibar_dhow_countries', 'zanzibar', 'store', 2002, 0, 'Dhow Countries Music Academy', 'Dhow Countriezinhas Music Academy', 'v'),
P('zanzibar_sauti_za_busara', 'zanzibar', 'fest', 2004, 0, 'Sauti za Busara (Old Fort)', 'Sauti za Busaka (Old Fort)', 'v'),
// Kampala
P('kampala_national_theatre', 'kampala', 'theatre', 1959, 0, 'Uganda National Theatre', 'Uganda Nacionalzinho Theatre', ''),
// Auckland
P('auckland_town_hall', 'auckland', 'theatre', 1911, 0, 'Auckland Town Hall', 'Auckland City Hallzinho', ''),
P('auckland_powerstation', 'auckland', 'venue', 1990, 0, 'The Powerstation', 'The Powerestação', 'v'),
// Wellington
P('wellington_michael_fowler', 'wellington', 'theatre', 1983, 0, 'Michael Fowler Centre', 'Michael Fowl Centre', ''),
P('wellington_cuba_st', 'wellington', 'bar', 1993, 0, 'San Francisco Bathhouse', 'San Francisco Banhouse', 'v'),
// Dunedin
P('dunedin_town_hall', 'dunedin', 'theatre', 1930, 0, 'Dunedin Town Hall', 'Dunedin City Hallzinho', ''),
P('dunedin_flying_nun', 'dunedin', 'label', 1981, 0, 'Flying Nun Records', 'Flying Nonna Records', 'v'),
// Brisbane
P('brisbane_festival_hall', 'brisbane', 'venue', 1959, 2003, 'Festival Hall', 'Festivalzinho Hall', 'v'),
P('brisbane_the_tivoli', 'brisbane', 'venue', 1917, 0, 'The Tivoli', 'The Tivolli', 'v'),
// Perth
P('perth_his_majestys', 'perth', 'theatre', 1904, 0, 'His Majesty\'s Theatre', 'His Majestinho\'s Theatre', ''),
P('perth_entertainment_centre', 'perth', 'arena', 1974, 2012, 'Perth Entertainment Centre', 'Perth Entretainment Centrinho', 'v'),
// Adelaide
P('adelaide_festival_centre', 'adelaide', 'theatre', 1973, 0, 'Adelaide Festival Centre', 'Adelaide Festivalzinho Centre', ''),
P('adelaide_thebarton', 'adelaide', 'venue', 1928, 0, 'Thebarton Theatre', 'Thebartolo Theatre', ''),
// Suva
P('suva_fbc', 'suva', 'radio', 1954, 0, 'Fiji Broadcasting Corporation', 'Fiji Broadcasting Corporaçãozinha', 'v'),
// Bridgetown
P('bridgetown_kensington', 'bridgetown', 'arena', 1871, 0, 'Kensington Oval', 'Kensington Ovalzinho', 'v'),
P('bridgetown_cbc', 'bridgetown', 'tv', 1964, 0, 'CBC Barbados', 'CBZ Barbados', 'v'),
// Nassau
P('nassau_compass_point', 'nassau', 'studio', 1977, 2010, 'Compass Point Studios', 'Compasso Point Studios', ''),
P('nassau_zns', 'nassau', 'radio', 1936, 0, 'ZNS Radio', 'ZNZ Radio', 'v'),
// Montego Bay
P('montego_bay_reggae_sumfest', 'montego_bay', 'fest', 1993, 0, 'Reggae Sumfest (Catherine Hall)', 'Reggae Somfest (Catherine Hall)', ''),
P('montego_bay_sunsplash', 'montego_bay', 'fest', 1978, 1996, 'Reggae Sunsplash (Jarrett Park)', 'Reggae Sunsplosh (Jarrett Park)', 'v'),
// San Pedro de Macorís
P('san_pedro_macoris_estadio', 'san_pedro_macoris', 'arena', 1959, 0, 'Estadio Tetelo Vargas', 'Estadio Tetelo Varginhas', 'v'),
// Hanoi
P('hanoi_opera', 'hanoi', 'theatre', 1911, 0, 'Hanoi Opera House', 'Hanoi Operazinha', ''),
P('hanoi_voice_of_vietnam', 'hanoi', 'radio', 1945, 0, 'Voice of Vietnam', 'Voz do Vietnamzinho', ''),
// Phnom Penh
P('phnom_penh_rnk', 'phnom_penh', 'radio', 1946, 0, 'National Radio of Kampuchea', 'National Rádio of Kampucheazinha', 'v'),
P('phnom_penh_chaktomuk', 'phnom_penh', 'theatre', 1961, 0, 'Chaktomuk Theatre', 'Chaktomukinho Theatre', 'v'),
// Yangon
P('yangon_myanmar_radio', 'yangon', 'radio', 1946, 0, 'Myanma Radio (Burma Broadcasting Service)', 'Rádio Birmaníssima', 'v'),
// Dhaka
P('dhaka_betar', 'dhaka', 'radio', 1939, 0, 'Bangladesh Betar (Dhaka)', 'Bangla Bétar-Bétar', 'v'),
P('dhaka_btv', 'dhaka', 'tv', 1964, 0, 'Bangladesh Television', 'Bangla Televisãozinha', ''),
// Colombo
P('colombo_radio_ceylon', 'colombo', 'radio', 1925, 0, 'Radio Ceylon (SLBC)', 'Rádio Ceilão de Chá', ''),
P('colombo_nelum_pokuna', 'colombo', 'theatre', 2011, 0, 'Nelum Pokuna Theatre', 'Teatro Nelum Pocinha', ''),
// Kathmandu
P('kathmandu_radio_nepal', 'kathmandu', 'radio', 1951, 0, 'Radio Nepal', 'Rádio Nepalhaço', ''),
// Riyadh
P('riyadh_saudi_tv', 'riyadh', 'tv', 1965, 0, 'Saudi TV (Channel 1)', 'TV das Dunas', 'v'),
// Baghdad
P('baghdad_radio', 'baghdad', 'radio', 1936, 0, 'Radio Baghdad', 'Rádio Bagdá-Dá', 'v'),
// Damascus
P('damascus_radio', 'damascus', 'radio', 1947, 0, 'Radio Damascus', 'Rádio Damasco-Damasquinho', 'v'),
P('damascus_opera', 'damascus', 'theatre', 2004, 0, 'Damascus Opera House (Dar al-Assad)', 'Ópera de Damascópio', ''),
// Amman
P('amman_radio_jordan', 'amman', 'radio', 1959, 0, 'Radio Jordan', 'Rádio Jordânia Jordanina', 'v'),
P('amman_jordan_tv', 'amman', 'tv', 1968, 0, 'Jordan Television', 'TV do Vale Jordão', ''),
// Jerusalem
P('jerusalem_pbs', 'jerusalem', 'radio', 1936, 1948, 'Palestine Broadcasting Service', 'Serviço de Radiodifusão da Terra Santa', 'v'),
P('jerusalem_kol_yisrael', 'jerusalem', 'radio', 1948, 0, 'Kol Yisrael', 'Kol Israelzinho', ''),
// Ramallah
P('ramallah_cultural_palace', 'ramallah', 'theatre', 2004, 0, 'Ramallah Cultural Palace', 'Palácio Cultural de Ramalhete', ''),
// Tbilisi
P('tbilisi_opera', 'tbilisi', 'theatre', 1851, 0, 'Tbilisi Opera and Ballet Theatre', 'Ópera de Tbilisonora', 'v'),
P('tbilisi_bassiani', 'tbilisi', 'venue', 2014, 0, 'Bassiani', 'Bassiano', ''),
// Yerevan
P('yerevan_opera', 'yerevan', 'theatre', 1933, 0, 'Armenian National Opera and Ballet Theatre', 'Ópera do Ararat', 'v'),
// Baku
P('baku_philharmonic', 'baku', 'theatre', 1912, 0, 'Azerbaijan State Philharmonic Hall', 'Filarmônica do Mar Cáspio', 'v'),
P('baku_crystal_hall', 'baku', 'arena', 2012, 0, 'Baku Crystal Hall', 'Baku Cristal Hall', ''),
// Bucharest
P('bucharest_athenaeum', 'bucharest', 'theatre', 1888, 0, 'Romanian Athenaeum', 'Ateneu Romanesco', ''),
P('bucharest_radio_romania', 'bucharest', 'radio', 1928, 0, 'Radio România', 'Rádio Romênia-Romã', ''),
// Sofia
P('sofia_bnr', 'sofia', 'radio', 1935, 0, 'Bulgarian National Radio', 'Rádio Nacional Búlgaro-Iogurte', ''),
P('sofia_ndk', 'sofia', 'theatre', 1981, 0, 'NDK (National Palace of Culture)', 'NDK (Palácio Nacional da Cultivação)', ''),
// Zagreb
P('zagreb_jugoton', 'zagreb', 'label', 1947, 1991, 'Jugoton', 'Jugotom', ''),
P('zagreb_radio', 'zagreb', 'radio', 1926, 0, 'Radio Zagreb', 'Rádio Zagrebinho', ''),
P('zagreb_lisinski', 'zagreb', 'theatre', 1973, 0, 'Vatroslav Lisinski Concert Hall', 'Sala Lisinho', ''),
// Ljubljana
P('ljubljana_cankarjev_dom', 'ljubljana', 'theatre', 1980, 0, 'Cankarjev dom', 'Cantarjev dom', ''),
P('ljubljana_metelkova', 'ljubljana', 'venue', 1993, 0, 'Metelkova', 'Metelkovinha', ''),
// Sarajevo
P('sarajevo_radio', 'sarajevo', 'radio', 1945, 0, 'Radio Sarajevo', 'Rádio Sarajevinho', ''),
P('sarajevo_skenderija', 'sarajevo', 'arena', 1969, 0, 'Skenderija', 'Escondelija', ''),
// Skopje
P('skopje_radio', 'skopje', 'radio', 1944, 0, 'Radio Skopje', 'Rádio Escopinho', ''),
// Tirana
P('tirana_radio', 'tirana', 'radio', 1938, 0, 'Radio Tirana', 'Rádio Tiraninha', ''),
// Bratislava
P('bratislava_slovak_radio', 'bratislava', 'radio', 1985, 0, 'Slovak Radio Building', 'Pirâmide do Rádio Eslovaco', ''),
P('bratislava_reduta', 'bratislava', 'theatre', 1915, 0, 'Reduta (Slovak Philharmonic)', 'Reduta Redutinha', 'v'),
// Vilnius
P('vilnius_opera', 'vilnius', 'theatre', 1974, 0, 'Lithuanian National Opera and Ballet Theatre', 'Ópera da Lituânia Lituana', ''),
// Riga
P('riga_opera', 'riga', 'theatre', 1863, 0, 'Latvian National Opera', 'Ópera de Rigatoni', ''),
P('riga_latvian_radio', 'riga', 'radio', 1925, 0, 'Latvian Radio', 'Rádio Letã-Letinha', ''),
// Tallinn
P('tallinn_song_grounds', 'tallinn', 'fest', 1960, 0, 'Tallinn Song Festival Grounds', 'Campo da Cantoria de Talinho', ''),
P('tallinn_estonia_theatre', 'tallinn', 'theatre', 1913, 0, 'Estonia Theatre', 'Teatro Estônia-Estonteante', ''),
// Minsk
P('minsk_belarusian_radio', 'minsk', 'radio', 1925, 0, 'Belarusian Radio', 'Rádio Bielorrusso-Branquinho', ''),
P('minsk_bolshoi', 'minsk', 'theatre', 1938, 0, 'Bolshoi Theatre of Belarus', 'Bolchinho de Minsk', ''),
// Odesa
P('odesa_opera', 'odesa', 'theatre', 1887, 0, 'Odesa Opera and Ballet Theatre', 'Ópera de Odessinha', ''),
// Lviv
P('lviv_opera', 'lviv', 'theatre', 1900, 0, 'Lviv Opera', 'Ópera de Leãozinho', ''),
// Wroclaw
P('wroclaw_centennial_hall', 'wroclaw', 'arena', 1913, 0, 'Centennial Hall (Hala Stulecia)', 'Hala Centenarinha', ''),
// Krakow
P('krakow_piwnica', 'krakow', 'bar', 1956, 0, 'Piwnica pod Baranami', 'Porão sob os Carneiros', ''),
P('krakow_u_muniaka', 'krakow', 'bar', 1992, 0, 'Jazz Club U Muniaka', 'Jazz Club U Muniquinho', ''),
// Gdansk
P('gdansk_radio', 'gdansk', 'radio', 1945, 0, 'Radio Gdańsk', 'Rádio Gdanskinho', ''),
P('gdansk_ergo_arena', 'gdansk', 'arena', 2010, 0, 'Ergo Arena', 'Ergo Arenoso', ''),
// Sopot
P('sopot_forest_opera', 'sopot', 'fest', 1909, 0, 'Forest Opera (Opera Leśna)', 'Ópera da Florestinha', ''),
// Lyon
P('lyon_opera', 'lyon', 'theatre', 1831, 0, 'Opéra de Lyon', 'Opéra de Leão', ''),
P('lyon_halle_tony_garnier', 'lyon', 'arena', 1988, 0, 'Halle Tony Garnier', 'Halle Tony Garnizé', ''),
P('lyon_transbordeur', 'lyon', 'venue', 1989, 0, 'Le Transbordeur', 'Le Transbordado', ''),
// Toulouse
P('toulouse_bikini', 'toulouse', 'venue', 1983, 0, 'Le Bikini', 'Le Maiô', 'v'),
P('toulouse_halle_aux_grains', 'toulouse', 'theatre', 1974, 0, 'Halle aux Grains', 'Halle aux Grãozinhos', ''),
// Strasbourg
P('strasbourg_laiterie', 'strasbourg', 'venue', 1994, 0, 'La Laiterie', 'La Leiteria', ''),
// Frankfurt
P('frankfurt_alte_oper', 'frankfurt', 'theatre', 1880, 0, 'Alte Oper', 'Alte Opereta', 'v'),
P('frankfurt_festhalle', 'frankfurt', 'arena', 1909, 0, 'Festhalle Frankfurt', 'Festahalle Salsichão', ''),
P('frankfurt_batschkapp', 'frankfurt', 'venue', 1976, 0, 'Batschkapp', 'Batschboné', ''),
// Dusseldorf
P('dusseldorf_kling_klang', 'dusseldorf', 'studio', 1970, 2009, 'Kling Klang Studio', 'Pling Plong Studio', 'v'),
P('dusseldorf_ratinger_hof', 'dusseldorf', 'bar', 1974, 0, 'Ratinger Hof', 'Ratinho Hof', 'v'),
// Leipzig
P('leipzig_gewandhaus', 'leipzig', 'theatre', 1781, 0, 'Gewandhaus', 'Gewandcasinha', 'v'),
P('leipzig_moritzbastei', 'leipzig', 'venue', 1982, 0, 'Moritzbastei', 'Moritzbastião', ''),
P('leipzig_mirag', 'leipzig', 'radio', 1924, 0, 'Mitteldeutscher Rundfunk (MIRAG/MDR)', 'Rádio Meio-Alemão', 'v'),
// Zurich
P('zurich_tonhalle', 'zurich', 'theatre', 1895, 0, 'Tonhalle Zürich', 'Tonhalle Queijo Suíço', ''),
P('zurich_hallenstadion', 'zurich', 'arena', 1939, 0, 'Hallenstadion', 'Hallenstadinho', ''),
P('zurich_rote_fabrik', 'zurich', 'venue', 1980, 0, 'Rote Fabrik', 'Rota Fábrica', ''),
// Leeds
P('leeds_town_hall', 'leeds', 'theatre', 1858, 0, 'Leeds Town Hall', 'Leeds Clock Hall', ''),
P('leeds_university_refectory', 'leeds', 'venue', 1951, 0, 'Leeds University Refectory', 'Leeds University Cafeteria', 'v'),
// Newcastle
P('newcastle_city_hall', 'newcastle', 'theatre', 1928, 0, 'Newcastle City Hall', 'Newcastle Town Hallway', ''),
P('newcastle_club_a_gogo', 'newcastle', 'venue', 1962, 1970, 'Club a\'Gogo', 'Club a\'Gaga', 'v'),
// Coventry
P('coventry_2_tone', 'coventry', 'label', 1979, 1986, '2 Tone Records', 'Two Shade Records', ''),
// Cork
P('cork_opera_house', 'cork', 'theatre', 1877, 0, 'Cork Opera House', 'Cork Ópera da Rolha', 'v'),
P('cork_sir_henrys', 'cork', 'venue', 1980, 2003, 'Sir Henry\'s', 'Sir Harry\'s', 'v'),
// Edinburgh
P('edinburgh_usher_hall', 'edinburgh', 'theatre', 1914, 0, 'Usher Hall', 'Hush Hall', ''),
P('edinburgh_playhouse', 'edinburgh', 'theatre', 1929, 0, 'Edinburgh Playhouse', 'Edinburgh Playhut', ''),
// Gothenburg
P('gothenburg_ullevi', 'gothenburg', 'arena', 1958, 0, 'Ullevi', 'Ullevou', ''),
P('gothenburg_konserthuset', 'gothenburg', 'theatre', 1935, 0, 'Göteborgs Konserthus', 'Konserthus do Gotemburguer', ''),
// Malmo
P('malmo_arena', 'malmo', 'arena', 2008, 0, 'Malmö Arena', 'Malmö Arenito', ''),
// Bergen
P('bergen_grieghallen', 'bergen', 'theatre', 1978, 0, 'Grieghallen', 'Griegalpão', ''),
// Tromso
P('tromso_kulturhus', 'tromso', 'theatre', 1984, 0, 'Tromsø Kulturhus', 'Tromsø Kulturcasinha', 'v'),
// Aarhus
P('aarhus_musikhuset', 'aarhus', 'theatre', 1982, 0, 'Musikhuset Aarhus', 'Musikcasinha Aarhus', ''),
P('aarhus_train', 'aarhus', 'venue', 1998, 0, 'Train', 'Trem', 'v'),
// Tampere
P('tampere_talo', 'tampere', 'theatre', 1990, 0, 'Tampere Hall (Tampere-talo)', 'Tampa-talo', ''),
// Akureyri
P('akureyri_hof', 'akureyri', 'theatre', 2010, 0, 'Hof', 'Hofshöll', ''),
// Torshavn
P('torshavn_nordic_house', 'torshavn', 'theatre', 1983, 0, 'Nordic House (Norðurlandahúsið)', 'Casa Nórdica do Carneiro', ''),
P('torshavn_tutl', 'torshavn', 'label', 1977, 0, 'Tutl', 'Tutu', ''),
// Louisville
P('louisville_whas', 'louisville', 'radio', 1922, 0, 'WHAS', 'WHAZ', ''),
P('louisville_palace', 'louisville', 'theatre', 1928, 0, 'Louisville Palace', 'Louisville Palacete', ''),
P('louisville_iroquois', 'louisville', 'venue', 1938, 0, 'Iroquois Amphitheater', 'Iroquês Amphitheater', 'v'),
// Pittsburgh
P('pittsburgh_kdka', 'pittsburgh', 'radio', 1920, 0, 'KDKA', 'KDKO', ''),
P('pittsburgh_syria_mosque', 'pittsburgh', 'theatre', 1916, 1991, 'Syria Mosque', 'Syria Hall', ''),
P('pittsburgh_heinz_hall', 'pittsburgh', 'theatre', 1971, 0, 'Heinz Hall', 'Ketchup Hall', ''),
// Portland
P('portland_crystal_ballroom', 'portland', 'venue', 1914, 0, 'Crystal Ballroom', 'Cristal Ballroom', ''),
P('portland_satyricon', 'portland', 'venue', 1983, 2011, 'Satyricon', 'Satiricão', ''),
// Denver
P('denver_red_rocks', 'denver', 'venue', 1941, 0, 'Red Rocks Amphitheatre', 'Red Pebbles Amphitheatre', ''),
P('denver_ogden', 'denver', 'theatre', 1917, 0, 'Ogden Theatre', 'Ogdoen Theatre', ''),
P('denver_mission_ballroom', 'denver', 'venue', 2019, 0, 'Mission Ballroom', 'Missão Ballroom', ''),
// Phoenix
P('phoenix_ktar', 'phoenix', 'radio', 1922, 0, 'KTAR', 'KSTAR', ''),
P('phoenix_audio_recorders', 'phoenix', 'studio', 1955, 0, 'Audio Recorders of Arizona', 'Áudio Gravadores do Cacto', 'v'),
// Muscle Shoals
P('muscle_shoals_fame_studios', 'muscle_shoals', 'studio', 1961, 0, 'FAME Studios', 'FOME Studios', 'u'),
P('muscle_shoals_sound_studio', 'muscle_shoals', 'studio', 1969, 1979, 'Muscle Shoals Sound Studio (3614 Jackson Hwy)', 'Mussel Shoals Sound Studio', ''),
// Macon
P('macon_capricorn_records', 'macon', 'label', 1969, 1980, 'Capricorn Records', 'Capricórnio Records', ''),
P('macon_grand_opera_house', 'macon', 'theatre', 1884, 0, 'Grand Opera House', 'Grande Ópera Caseira', ''),
// St. Louis
P('st_louis_kmox', 'st_louis', 'radio', 1925, 0, 'KMOX', 'KMIX', ''),
P('st_louis_fox_theatre', 'st_louis', 'theatre', 1929, 0, 'Fabulous Fox Theatre', 'Fabulous Raposa Theatre', ''),
P('st_louis_blueberry_hill', 'st_louis', 'bar', 1972, 0, 'Blueberry Hill', 'Strawberry Hill', ''),
// Buffalo
P('buffalo_kleinhans', 'buffalo', 'theatre', 1940, 0, 'Kleinhans Music Hall', 'Kleinhands Music Hall', ''),
P('buffalo_sheas', 'buffalo', 'theatre', 1926, 0, 'Shea\'s Buffalo Theatre', 'Shay\'s Bisão Theatre', ''),
// Nuuk
P('nuuk_knr', 'nuuk', 'radio', 1958, 0, 'KNR (Kalaallit Nunaata Radioa)', 'KNR Rádio do Gelo', 'v'),
// Tijuana
P('tijuana_cecut', 'tijuana', 'theatre', 1982, 0, 'Centro Cultural Tijuana (CECUT)', 'Centro Cultural Tijuanita', ''),
// Culiacan
P('culiacan_teatro_villavicencio', 'culiacan', 'theatre', 1991, 0, 'Teatro Pablo de Villavicencio', 'Teatro Pablito de Villavicêncio', 'v'),
// Quito
P('quito_hcjb', 'quito', 'radio', 1931, 0, 'Radio HCJB (La Voz de los Andes)', 'Rádio HCJ-Bê (A Voz dos Andinhos)', ''),
P('quito_teatro_sucre', 'quito', 'theatre', 1886, 0, 'Teatro Nacional Sucre', 'Teatro Nacional Açúcar', ''),
P('quito_casa_musica', 'quito', 'theatre', 2005, 0, 'Teatro Casa de la Música', 'Teatro Casinha da Música', 'v'),
// La Paz
P('la_paz_radio_illimani', 'la_paz', 'radio', 1933, 0, 'Radio Illimani', 'Rádio Ilimitani', ''),
P('la_paz_teatro_municipal', 'la_paz', 'theatre', 1845, 0, 'Teatro Municipal Alberto Saavedra Pérez', 'Teatro Municipal das Alturas', ''),
// Asuncion
P('asuncion_teatro_municipal', 'asuncion', 'theatre', 1889, 0, 'Teatro Municipal Ignacio A. Pane', 'Teatro Municipal Ignácio Pão', 'v'),
// Tegucigalpa
P('tegucigalpa_teatro_nacional', 'tegucigalpa', 'theatre', 1915, 0, 'Teatro Nacional Manuel Bonilla', 'Teatro Nacional Manuel Bonitinha', ''),
// Douala
P('douala_radio', 'douala', 'radio', 1955, 0, 'Radio Douala (CRTV)', 'Rádio Doualinha', 'v'),
// Brazzaville
P('brazzaville_radio', 'brazzaville', 'radio', 1940, 0, 'Radio Brazzaville', 'Rádio Brazzavilinha', 'v'),
P('brazzaville_faignond', 'brazzaville', 'bar', 1948, 0, 'Chez Faignond (Poto-Poto)', 'Chez Fainhonho (Poto-Poto)', 'v'),
// Conakry
P('conakry_rtg', 'conakry', 'radio', 1958, 0, 'Radio Télévision Guinéenne (RTG)', 'Rádio Televisão Guinéula', 'v'),
// Cotonou
P('cotonou_ortb', 'cotonou', 'radio', 1953, 0, 'ORTB (Radio Dahomey)', 'ORTBê (Rádio Daomezinho)', 'v'),
// Lome
P('lome_radio', 'lome', 'radio', 1953, 0, 'Radio Lomé', 'Rádio Lomézinho', 'v'),
// Ouagadougou
P('ouagadougou_radio', 'ouagadougou', 'radio', 1959, 0, 'Radiodiffusion Télévision du Burkina', 'Rádio Ouaga-Ouaga', 'v'),
// Niamey
P('niamey_ortn', 'niamey', 'radio', 1958, 0, 'Voix du Sahel (ORTN)', 'Voz do Sahelzinho', 'v'),
// Praia
P('praia_rcv', 'praia', 'radio', 1975, 0, 'Rádio de Cabo Verde', 'Rádio do Cabo Bem-Verde', 'v'),
// Mindelo
P('mindelo_baia_das_gatas', 'mindelo', 'fest', 1984, 0, 'Baía das Gatas', 'Baía dos Gatos', ''),
P('mindelo_radio_barlavento', 'mindelo', 'radio', 1955, 1975, 'Rádio Barlavento', 'Rádio Sotavento', 'v'),
// Mogadishu
P('mogadishu_radio', 'mogadishu', 'radio', 1951, 0, 'Radio Mogadishu', 'Rádio Mogadíscio-Disco', 'v'),
// Khartoum
P('khartoum_omdurman_radio', 'khartoum', 'radio', 1940, 0, 'Radio Omdurman', 'Rádio Omdurmindo', 'v'),
// Lubumbashi
P('lubumbashi_radio', 'lubumbashi', 'radio', 1960, 0, 'RTNC Lubumbashi (Radio Katanga)', 'Rádio Katanguinha', 'v'),
// Windhoek
P('windhoek_nbc', 'windhoek', 'radio', 1979, 0, 'NBC (Namibian Broadcasting Corporation)', 'NBC (Namíbia Barulho Corporation)', 'v'),
// Lusaka
P('lusaka_znbc', 'lusaka', 'radio', 1941, 0, 'ZNBC (Radio Lusaka)', 'ZNBC (Rádio Lusakinha)', 'v'),
// Gaborone
P('gaborone_radio_botswana', 'gaborone', 'radio', 1965, 0, 'Radio Botswana', 'Rádio Botsuaninha', 'v'),
// Rabat
P('rabat_snrt', 'rabat', 'radio', 1928, 0, 'Radio Maroc (SNRT)', 'Rádio Marrocos-Marroquinho', ''),
P('rabat_olm_souissi', 'rabat', 'fest', 2001, 0, 'OLM Souissi (Mawazine)', 'OLM Suíssi (Mawazinho)', 'v'),
// Marrakech
P('marrakech_el_badi', 'marrakech', 'fest', 1960, 0, 'El Badi Palace (Festival National des Arts Populaires)', 'Palácio El Bandido', 'v'),
// Alexandria
P('alexandria_sayed_darwish', 'alexandria', 'theatre', 1921, 0, 'Sayed Darwish Theatre (Alexandria Opera House)', 'Teatro Sayed Darwinho', ''),
P('alexandria_bibliotheca', 'alexandria', 'theatre', 2002, 0, 'Bibliotheca Alexandrina', 'Bibliotequinha Alexandrina', ''),
// Noumea
P('noumea_tjibaou', 'noumea', 'theatre', 1998, 0, 'Centre culturel Tjibaou', 'Centro Cultural Tjibau-Bau', ''),
// Papeete
P('papeete_radio_tahiti', 'papeete', 'radio', 1951, 0, 'Radio Tahiti', 'Rádio Taitizinho', 'v'),
P('papeete_toata', 'papeete', 'venue', 2001, 0, 'Place To\'ata', 'Praça To\'atinha', 'v'),
// Apia
P('apia_2ap', 'apia', 'radio', 1948, 0, 'Radio 2AP', 'Rádio 2AÊ', 'v'),
];
