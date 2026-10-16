// R31 · onda 3 (Z) — BANDAS DE FILMES, SÉRIES E ANIMAÇÕES: só os DADOS (plano-pagina.md, "Bandas de filmes, séries e
// animações"). A ativação por modo (histórico: ficção que virou real com carreira definida; simulado; crossover: ficção
// pura e referências) e pelo interruptor "Nomes e obras reais" é da onda 4 (X). Nada aqui entra no mundo ainda.
// `ano` = ano em que a HISTÓRIA se passa (a banda surge nele, não no ano da obra); `obraAno` = estreia do filme/série
// (dia de notícia e pico de fama). Cidade fictícia: `lugar` diz o lugar da obra e `c` a cidade do jogo mais próxima.
// Curadoria (apelidos, fontes, campos a confirmar) em src/data/cur31.ts; nome real registrado em realnames31 ('cur').

export type FicKind31 = 'virou_real' | 'so_ficcao';
export interface Fiction31 {
  id: string;
  n: string;
  kind: FicKind31;
  /** obra de origem (título original) */
  obra: string;
  obraAno: number;
  /** ano em que a história se passa (a banda surge nele) */
  ano: number;
  /** id de cidade do jogo (a mais próxima do lugar da obra) */
  c: string;
  /** lugar da obra quando não é a própria cidade (ex.: "Hill Valley, Califórnia") */
  lugar?: string;
  g: string;
  /** integrantes (personagens ou intérpretes) */
  m: string[];
  lang: string;
  /** detalhe de fã (easter egg) */
  fan?: string;
  /** já está na base de artistas reais (REAL_ALL): a onda 4 só liga a obra a esse ato, sem criar outro */
  naBase?: true;
}

const F = (id: string, n: string, kind: FicKind31, obra: string, obraAno: number, ano: number, c: string, g: string, m: string[], lang = 'en', lugar?: string, fan?: string): Fiction31 =>
  ({ id, n, kind, obra, obraAno, ano, c, g, m, lang, ...(lugar ? { lugar } : {}), ...(fan ? { fan } : {}) });

/** Já na base de artistas reais (não duplicar na ativação): The Monkees, Hatsune Miku. */
const NA_BASE31 = new Set(['monkees', 'hatsune_miku']);
const FICTION31_RAW: Fiction31[] = [
  // ---------------------------------------------------------------- ficção que virou real
  F('monkees', 'The Monkees', 'virou_real', 'The Monkees (NBC)', 1966, 1966, 'los_angeles', 'pop_rock', ['Micky Dolenz', 'Davy Jones', 'Michael Nesmith', 'Peter Tork']),
  F('archies', 'The Archies', 'virou_real', 'The Archie Show', 1968, 1969, 'new_york', 'teen_pop', ['Archie Andrews', 'Jughead Jones', 'Reggie Mantle', 'Betty Cooper', 'Veronica Lodge'], 'en', 'Riverdale', '"Sugar, Sugar" chega ao topo sem a banda existir de verdade.'),
  F('partridge', 'The Partridge Family', 'virou_real', 'The Partridge Family (ABC)', 1970, 1970, 'los_angeles', 'teen_pop', ['Shirley Jones', 'David Cassidy'], 'en', 'San Pueblo, Califórnia'),
  F('chipmunks', 'Alvin and the Chipmunks', 'virou_real', 'The Chipmunk Song', 1958, 1958, 'los_angeles', 'trad_pop', ['Alvin', 'Simon', 'Theodore', 'David Seville']),
  F('blues_brothers', 'The Blues Brothers', 'virou_real', 'Saturday Night Live / The Blues Brothers', 1978, 1978, 'chicago', 'blues_rock', ['Jake Blues', 'Elwood Blues'], 'en', undefined, 'Estão "numa missão de Deus".'),
  F('spinal_tap', 'Spinal Tap', 'virou_real', 'This Is Spinal Tap', 1984, 1984, 'london', 'heavy_metal', ['David St. Hubbins', 'Nigel Tufnel', 'Derek Smalls'], 'en', undefined, 'O amplificador que vai até 11 pode virar relíquia.'),
  F('rutles', 'The Rutles', 'virou_real', 'All You Need Is Cash', 1978, 1962, 'liverpool', 'beat', ['Ron Nasty', 'Dirk McQuickly', 'Stig O\'Hara', 'Barry Wom']),
  F('rbd', 'RBD', 'virou_real', 'Rebelde', 2004, 2004, 'mexico_city', 'teen_pop', ['Anahí', 'Dulce María', 'Maite Perroni', 'Christian Chávez', 'Christopher von Uckermann', 'Alfonso Herrera'], 'es'),
  F('big_time_rush', 'Big Time Rush', 'virou_real', 'Big Time Rush (Nickelodeon)', 2009, 2009, 'los_angeles', 'boy_band', ['Kendall Schmidt', 'James Maslow', 'Carlos PenaVega', 'Logan Henderson']),
  F('hannah_montana', 'Hannah Montana', 'virou_real', 'Hannah Montana (Disney Channel)', 2006, 2006, 'los_angeles', 'teen_pop', ['Miley Stewart']),
  F('new_directions', 'New Directions', 'virou_real', 'Glee', 2009, 2009, 'cleveland', 'pop_rock', ['Rachel Berry', 'Finn Hudson', 'Kurt Hummel', 'Mercedes Jones'], 'en', 'Lima, Ohio'),
  F('wildcats', 'Wildcats', 'virou_real', 'High School Musical', 2006, 2006, 'phoenix', 'teen_pop', ['Troy Bolton', 'Gabriella Montez', 'Sharpay Evans'], 'en', 'Albuquerque, Novo México'),
  F('violetta', 'Violetta', 'virou_real', 'Violetta (Disney Channel)', 2012, 2012, 'buenos_aires', 'teen_pop', ['Violetta Castillo'], 'es'),
  F('patito_feo', 'Patito Feo', 'virou_real', 'Patito Feo', 2007, 2007, 'buenos_aires', 'teen_pop', ['Patito', 'Antonella'], 'es'),
  F('huntrx', 'HUNTR/X', 'virou_real', 'KPop Demon Hunters', 2025, 2025, 'seoul', 'kpop', ['Rumi', 'Mira', 'Zoey'], 'ko'),
  F('saja_boys', 'Saja Boys', 'virou_real', 'KPop Demon Hunters', 2025, 2025, 'seoul', 'kpop', ['Jinu', 'Abby', 'Mystery', 'Romance', 'Baby'], 'ko'),
  F('hatsune_miku', 'Hatsune Miku', 'virou_real', 'Hatsune Miku (Crypton Future Media)', 2007, 2007, 'tokyo', 'vocaloid_pop', ['Hatsune Miku'], 'ja', 'Sapporo', 'Faz shows por holograma.'),
  F('kda', 'K/DA', 'virou_real', 'League of Legends', 2018, 2018, 'los_angeles', 'kpop', ['Ahri', 'Akali', 'Evelynn', 'Kai\'Sa'], 'ko', undefined, 'Show por holograma na final do campeonato.'),
  F('lynn_minmay', 'Lynn Minmay', 'virou_real', 'Super Dimension Fortress Macross', 1982, 2009, 'tokyo', 'anison', ['Lynn Minmay'], 'ja', 'Macross City'),
  F('hokago_tea_time', 'Ho-kago Tea Time', 'virou_real', 'K-On!', 2009, 2009, 'osaka', 'anison', ['Yui Hirasawa', 'Mio Akiyama', 'Ritsu Tainaka', 'Tsumugi Kotobuki', 'Azusa Nakano'], 'ja', 'Kyoto'),
  F('kessoku_band', 'Kessoku Band', 'virou_real', 'Bocchi the Rock!', 2022, 2022, 'tokyo', 'anison', ['Hitori Gotoh', 'Nijika Ijichi', 'Ryo Yamada', 'Ikuyo Kita'], 'ja', 'Shimokitazawa, Tóquio'),
  F('poppin_party', 'Poppin\'Party', 'virou_real', 'BanG Dream!', 2015, 2015, 'tokyo', 'anison', ['Kasumi Toyama', 'Tae Hanazono', 'Rimi Ushigome', 'Saya Yamabuki', 'Arisa Ichigaya'], 'ja'),

  // ---------------------------------------------------------------- só na ficção
  F('wonders', 'The Wonders', 'so_ficcao', 'That Thing You Do!', 1996, 1964, 'pittsburgh', 'beat', ['Jimmy Mattingly', 'Guy Patterson', 'Lenny Haise', 'T.B. Player'], 'en', 'Erie, Pensilvânia', 'Um único sucesso enorme e o fim.'),
  F('starlighters', 'Marvin Berry and the Starlighters', 'so_ficcao', 'Back to the Future', 1985, 1955, 'los_angeles', 'rnr', ['Marvin Berry'], 'en', 'Hill Valley, Califórnia', 'Marvin liga para o primo Chuck em 1955.'),
  F('soggy_bottom', 'The Soggy Bottom Boys', 'so_ficcao', 'O Brother, Where Art Thou?', 2000, 1937, 'memphis', 'old_time', ['Ulysses Everett McGill', 'Pete Hogwallop', 'Delmar O\'Donnell', 'Tommy Johnson'], 'en', 'Mississippi'),
  F('cruisers', 'Eddie and the Cruisers', 'so_ficcao', 'Eddie and the Cruisers', 1983, 1963, 'new_york', 'rnr', ['Eddie Wilson', 'Frank Ridgeway'], 'en', 'Nova Jersey'),
  F('dewey_cox', 'Dewey Cox', 'so_ficcao', 'Walk Hard: The Dewey Cox Story', 2007, 1957, 'memphis', 'rockabilly', ['Dewey Cox'], 'en', 'Alabama'),
  F('stillwater', 'Stillwater', 'so_ficcao', 'Almost Famous', 2000, 1973, 'los_angeles', 'arena_rock', ['Russell Hammond', 'Jeff Bebe'], 'en', 'Troy, Michigan'),
  F('electric_mayhem', 'Dr. Teeth and the Electric Mayhem', 'so_ficcao', 'The Muppet Show', 1976, 1976, 'london', 'funk', ['Dr. Teeth', 'Animal', 'Floyd Pepper', 'Janice', 'Zoot']),
  F('be_sharps', 'The Be Sharps', 'so_ficcao', 'The Simpsons — "Homer\'s Barbershop Quartet"', 1993, 1985, 'portland', 'barbershop', ['Homer Simpson', 'Apu Nahasapeemapetilon', 'Seymour Skinner', 'Barney Gumble'], 'en', 'Springfield'),
  F('holograms', 'Jem and the Holograms', 'so_ficcao', 'Jem', 1985, 1985, 'los_angeles', 'synthpop', ['Jem', 'Kimber', 'Aja', 'Shana']),
  F('misfits_jem', 'The Misfits (Jem)', 'so_ficcao', 'Jem', 1985, 1985, 'los_angeles', 'new_wave', ['Pizzazz', 'Roxy', 'Stormer']),
  F('pussycats', 'Josie and the Pussycats', 'so_ficcao', 'Josie and the Pussycats', 1970, 1970, 'new_york', 'teen_pop', ['Josie McCoy', 'Melody Valentine', 'Valerie Brown'], 'en', 'Riverdale'),
  F('daisy_jones', 'Daisy Jones & The Six', 'so_ficcao', 'Daisy Jones & The Six', 2019, 1975, 'los_angeles', 'soft_rock', ['Daisy Jones', 'Billy Dunne', 'Karen Sirko', 'Graham Dunne', 'Eddie Roundtree', 'Warren Rhodes']),
  F('pop_band', 'PoP!', 'so_ficcao', 'Music and Lyrics', 2007, 1984, 'london', 'synthpop', ['Alex Fletcher', 'Colin Thompson']),
  F('commitments', 'The Commitments', 'so_ficcao', 'The Commitments', 1991, 1991, 'dublin', 'soul', ['Jimmy Rabbitte', 'Deco Cuffe', 'Joey "The Lips" Fagan']),
  F('wyld_stallyns', 'Wyld Stallyns', 'so_ficcao', 'Bill & Ted\'s Excellent Adventure', 1989, 1989, 'los_angeles', 'hard_rock', ['Bill S. Preston', 'Ted Logan'], 'en', 'San Dimas, Califórnia'),
  F('crucial_taunt', 'Crucial Taunt', 'so_ficcao', 'Wayne\'s World', 1992, 1992, 'chicago', 'alt_rock', ['Cassandra Wong'], 'en', 'Aurora, Illinois'),
  F('lone_rangers', 'The Lone Rangers', 'so_ficcao', 'Airheads', 1994, 1994, 'los_angeles', 'hard_rock', ['Chazz Darby', 'Rex', 'Pip']),
  F('sadgasm', 'Sadgasm', 'so_ficcao', 'The Simpsons — "That \'90s Show"', 2008, 1991, 'seattle', 'grunge', ['Homer Simpson'], 'en', 'Springfield'),
  F('rippers', 'Jesse and the Rippers', 'so_ficcao', 'Full House', 1987, 1987, 'san_francisco', 'rnr', ['Jesse Katsopolis']),
  F('zack_attack', 'Zack Attack', 'so_ficcao', 'Saved by the Bell', 1990, 1990, 'los_angeles', 'pop_rock', ['Zack Morris', 'Kelly Kapowski', 'A.C. Slater', 'Jessie Spano', 'Screech Powers'], 'en', 'Bayside'),
  F('dingoes', 'Dingoes Ate My Baby', 'so_ficcao', 'Buffy the Vampire Slayer', 1998, 1998, 'los_angeles', 'indie', ['Daniel "Oz" Osbourne', 'Devon MacLeish'], 'en', 'Sunnydale'),
  F('steel_dragon', 'Steel Dragon', 'so_ficcao', 'Rock Star', 2001, 1985, 'pittsburgh', 'heavy_metal', ['Chris "Izzy" Cole', 'Kirk Cuddy', 'Bobby Beers']),
  F('infant_sorrow', 'Infant Sorrow', 'so_ficcao', 'Forgetting Sarah Marshall', 2008, 2008, 'london', 'alt_rock', ['Aldous Snow']),
  F('sex_bob_omb', 'Sex Bob-Omb', 'so_ficcao', 'Scott Pilgrim vs. the World', 2010, 2010, 'toronto', 'garage_rock', ['Scott Pilgrim', 'Kim Pine', 'Stephen Stills']),
  F('dethklok', 'Dethklok', 'so_ficcao', 'Metalocalypse', 2006, 2006, 'stockholm', 'death_metal', ['Nathan Explosion', 'Skwisgaar Skwigelf', 'Toki Wartooth', 'William Murderface', 'Pickles']),
  F('connect3', 'Connect 3', 'so_ficcao', 'Camp Rock', 2008, 2008, 'new_york', 'pop_rock', ['Shane Gray', 'Nate Gray', 'Jason Gray']),
  F('style_boyz', 'The Style Boyz', 'so_ficcao', 'Popstar: Never Stop Never Stopping', 2016, 2016, 'los_angeles', 'hiphop', ['Conner4Real', 'Owen', 'Lawrence']),
  F('fire_saga', 'Fire Saga', 'so_ficcao', 'Eurovision Song Contest: The Story of Fire Saga', 2020, 2020, 'reykjavik', 'eurodance', ['Lars Erickssong', 'Sigrit Ericksdóttir'], 'is', 'Húsavík, Islândia'),
  F('drive_shaft', 'Drive Shaft', 'so_ficcao', 'Lost', 2004, 1999, 'manchester', 'britpop', ['Charlie Pace', 'Liam Pace'], 'en', undefined, '"You All Everybody".'),
  F('mouse_rat', 'Mouse Rat', 'so_ficcao', 'Parks and Recreation', 2009, 2009, 'minneapolis', 'indie', ['Andy Dwyer'], 'en', 'Pawnee, Indiana'),
  F('sing_street', 'Sing Street', 'so_ficcao', 'Sing Street', 2016, 1985, 'dublin', 'new_wave', ['Conor "Cosmo" Lalor', 'Eamon', 'Darren']),
  F('jackson_maine', 'Jackson Maine & Ally', 'so_ficcao', 'A Star Is Born', 2018, 2018, 'los_angeles', 'country_pop', ['Jackson Maine', 'Ally Campana']),
  F('rayna_jaymes', 'Rayna Jaymes', 'so_ficcao', 'Nashville', 2012, 2012, 'nashville', 'country_pop', ['Rayna Jaymes']),
  F('lyon_family', 'Família Lyon', 'so_ficcao', 'Empire', 2015, 2015, 'new_york', 'hiphop', ['Lucious Lyon', 'Jamal Lyon', 'Hakeem Lyon']),
];
export const FICTION31: Fiction31[] = FICTION31_RAW.map((f) => (NA_BASE31.has(f.id) ? { ...f, naBase: true as const } : f));
