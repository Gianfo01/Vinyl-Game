// Rodada 19 (world19/hood19) — o BAIRRO da sede: nome e caráter por cidade e época (bairros musicais
// documentados) e clima da cidade (chuva/sol/neve). Cidades sem entrada usam um ciclo genérico.
// Cada bairro tem uma LINHA DO TEMPO por década (k): gentrificação histórica 0..1 (0 = barato e artístico,
// ~0,55 = na moda, ~0,85 = caro e arrumado) e uma nota opcional do que mudou — nada aparece antes do ano.

import { l, type L } from './world';

/** Ponto da linha do tempo: [ano, gentrificação 0..1, nota pt?, nota en?]. */
export type Kf19 = [number, number, string?, string?];
export interface Hood19 { from: number; to: number; n: L; d: L; k: Kf19[] }
const h = (from: number, to: number, pt: string, en: string, dpt: string, den: string, k: Kf19[]): Hood19 => ({ from, to, n: l(pt, en), d: l(dpt, den), k });

export const HOODS19: Record<string, Hood19[]> = {
  new_york: [h(0, 1893, 'Union Square', 'Union Square', 'Editoras de partituras e teatros de variedades na 14th Street.', 'Sheet-music publishers and variety theatres on 14th Street.',
      [[1880, 0.55, 'Teatros de vaudeville e lojas de piano em volta da praça.', 'Vaudeville theatres and piano shops around the square.']]),
    h(1893, 1930, 'Tin Pan Alley', 'Tin Pan Alley', 'A rua das editoras de partituras: pianos tocando em todas as janelas.', 'The sheet-music publishers\' street: pianos playing in every window.',
      [[1893, 0.45, 'As editoras se mudam para a West 28th Street; aluguel ainda modesto.', 'Publishers move to West 28th Street; rent still modest.'], [1905, 0.6, 'O apelido "Tin Pan Alley" pega: a rua vira o centro da música popular.', 'The "Tin Pan Alley" nickname sticks: the street is the hub of popular music.'], [1920, 0.55], [1928, 0.4, 'Rádio e cinema falado levam as editoras para a Broadway: a rua esvazia.', 'Radio and talkies pull publishers to Broadway: the street empties.']]),
    h(1930, 1958, 'Harlem', 'Harlem', 'Clubes de jazz e salões de baile (o Savoy, o Cotton Club).', 'Jazz clubs and ballrooms (the Savoy, the Cotton Club).',
      [[1930, 0.5, 'Fim do Renascimento do Harlem; a Depressão chega forte.', 'The Harlem Renaissance fades; the Depression hits hard.'], [1934, 0.35, 'O Apollo abre as portas para artistas negros; noite amadora às quartas.', 'The Apollo opens to Black performers; amateur night on Wednesdays.'], [1943, 0.2, 'Revolta de 1943; donos de imóveis param de investir.', 'The 1943 riot; landlords stop investing.'], [1950, 0.12, 'Cortiços e aluguel barato; o bebop ferve nos clubes da 118th.', 'Tenements and cheap rent; bebop boils in the 118th Street clubs.'], [1957, 0.08]]),
    h(1958, 1970, 'Greenwich Village', 'Greenwich Village', 'Cafés de folk, poetas e porões.', 'Folk cafés, poets and basements.',
      [[1958, 0.3, 'Cafés beat e porões baratos na MacDougal Street.', 'Beat cafés and cheap basements on MacDougal Street.'], [1963, 0.5, 'O boom do folk: filas na porta dos cafés, turistas no fim de semana.', 'The folk boom: lines outside the cafés, weekend tourists.'], [1968, 0.6]]),
    h(1970, 2003, 'SoHo', 'SoHo', 'Lofts industriais viraram estúdios e galerias.', 'Industrial lofts turned into studios and galleries.',
      [[1970, 0.08, 'Fábricas vazias; artistas moram ilegalmente nos lofts.', 'Empty factories; artists live illegally in the lofts.'], [1975, 0.15, 'Lofts de artista legalizados; galerias e ensaios em galpões.', 'Artist lofts legalised; galleries and warehouse rehearsals.'], [1981, 0.42, 'Galerias famosas e restaurantes: o bairro fica na moda.', 'Famous galleries and restaurants: the area turns hip.'], [1988, 0.68, 'Butiques chegam; artistas começam a sair.', 'Boutiques arrive; artists start to leave.'], [1995, 0.85, 'Lojas de grife: o SoHo virou shopping a céu aberto.', 'Designer stores: SoHo is an open-air mall.'], [2002, 0.95]]),
    h(2003, 9999, 'Williamsburg', 'Williamsburg', 'Bandas novas, bares em galpões e aluguel subindo.', 'New bands, warehouse bars and rising rents.',
      [[2003, 0.35, 'Galpões à beira do rio viram casas de show.', 'Riverside warehouses become venues.'], [2005, 0.45, 'Rezoneamento libera torres na orla.', 'Rezoning allows waterfront towers.'], [2010, 0.68], [2015, 0.85, 'Torres de vidro e lojas de grife; as casas pequenas fecham.', 'Glass towers and flagship stores; small venues close.'], [2022, 0.92]])],
  london: [h(0, 1911, 'Leicester Square', 'Leicester Square', 'Music halls (o Alhambra, o Empire) e editoras.', 'Music halls (the Alhambra, the Empire) and publishers.',
      [[1885, 0.55, 'Os grandes music halls lotam toda noite.', 'The great music halls pack out every night.']]),
    h(1911, 1958, 'Denmark Street', 'Denmark Street', 'A "Tin Pan Alley" de Londres: editoras e lojas de instrumentos.', 'London\'s "Tin Pan Alley": publishers and instrument shops.',
      [[1911, 0.35, 'Primeira editora de música na rua.', 'The first music publisher opens on the street.'], [1926, 0.5, 'O Melody Maker é fundado aqui: a rua vira referência.', 'Melody Maker is founded here: the street becomes the reference.'], [1941, 0.3, 'Blitz: prédios danificados, aluguel cai.', 'The Blitz: damaged buildings, rents fall.'], [1952, 0.35]]),
    h(1958, 1978, 'Soho', 'Soho', 'Clubes, cafés e estúdios na mesma quadra.', 'Clubs, cafés and studios on the same block.',
      [[1958, 0.3, 'Cafés de skiffle (o 2i\'s) e porões baratos.', 'Skiffle coffee bars (the 2i\'s) and cheap cellars.'], [1966, 0.62, 'Swinging London: Carnaby Street e o Marquee lotados.', 'Swinging London: Carnaby Street and the Marquee packed.'], [1972, 0.45], [1977, 0.3, 'Lojas de sexo e prédios sujos: o aluguel cai de novo.', 'Sex shops and grimy buildings: rents fall again.']]),
    h(1978, 2000, 'Camden', 'Camden', 'Mercado, pubs com palco e cena alternativa.', 'Market, pubs with stages and an alternative scene.',
      [[1978, 0.15, 'Armazéns do canal viram mercado e pubs com palco.', 'Canal warehouses become a market and pubs with stages.'], [1988, 0.3], [1994, 0.5, 'Britpop: o Good Mixer e o Camden Palace na moda.', 'Britpop: the Good Mixer and Camden Palace are hip.'], [1999, 0.58]]),
    h(2000, 9999, 'Shoreditch', 'Shoreditch', 'Galpões criativos, grafite e startups.', 'Creative warehouses, graffiti and startups.',
      [[2000, 0.3, 'Galpões baratos, grafite e clubes improvisados.', 'Cheap warehouses, graffiti and pop-up clubs.'], [2006, 0.5], [2012, 0.72, 'Startups chegam: "Silicon Roundabout".', 'Startups arrive: "Silicon Roundabout".'], [2020, 0.88]])],
  rio: [h(0, 1958, 'Lapa', 'Lapa', 'Boêmia, samba e cabarés sob os Arcos.', 'Bohemia, samba and cabarets under the Arches.',
      [[1890, 0.3], [1920, 0.48, 'A "Montmartre carioca": cabarés, malandros e poetas.', 'Rio\'s "Montmartre": cabarets, hustlers and poets.'], [1935, 0.42], [1942, 0.25, 'O Estado Novo fecha cabarés; a boêmia se dispersa.', 'The Estado Novo shuts cabarets; bohemia scatters.'], [1955, 0.15]]),
    h(1958, 1990, 'Copacabana', 'Copacabana', 'Boates, apartamentos e a bossa nova.', 'Nightclubs, apartments and bossa nova.',
      [[1958, 0.62, 'O Beco das Garrafas: bossa nova nas boates.', 'Beco das Garrafas: bossa nova in the nightclubs.'], [1968, 0.8, 'Apartamentos de luxo de frente para o mar.', 'Luxury flats on the beachfront.'], [1978, 0.7], [1988, 0.52, 'Prédios envelhecem e a classe alta vai para Ipanema e Leblon.', 'Buildings age and the wealthy move to Ipanema and Leblon.']]),
    h(1990, 9999, 'Lapa', 'Lapa', 'A Lapa renasce: rodas de samba e casarões restaurados.', 'Lapa reborn: samba circles and restored townhouses.',
      [[1990, 0.1, 'Casarões abandonados e aluguel baixíssimo.', 'Abandoned townhouses and rock-bottom rent.'], [1998, 0.28, 'Rodas de samba voltam aos casarões da Rua do Lavradio.', 'Samba circles return to Rua do Lavradio\'s townhouses.'], [2005, 0.52, 'Casas de samba lotadas toda sexta.', 'Samba houses packed every Friday.'], [2016, 0.62]])],
  sao_paulo: [h(0, 1960, 'Centro', 'Downtown', 'Rádios, teatros e confeitarias.', 'Radio stations, theatres and tearooms.',
      [[1900, 0.55], [1930, 0.68, 'Rádios e teatros elegantes; a elite passeia na Rua Direita.', 'Radio stations and elegant theatres; the elite strolls on Rua Direita.'], [1955, 0.5, 'A elite muda para a Paulista; o centro começa a envelhecer.', 'The elite moves to Paulista; downtown starts to age.']]),
    h(1960, 1990, 'Rua Augusta', 'Rua Augusta', 'Boates, lojas chiques e lojas de disco.', 'Nightclubs, chic shops and record stores.',
      [[1960, 0.7, 'Lojas chiques e carros desfilando na Augusta.', 'Chic shops and cars cruising Augusta.'], [1966, 0.6, 'A Jovem Guarda: lojas de disco e lanchonetes cheias.', 'Jovem Guarda: record shops and diners full.'], [1980, 0.32, 'Boates e inferninhos; o comércio fino vai para os shoppings.', 'Nightclubs and dives; upscale shops leave for the malls.']]),
    h(1990, 9999, 'Vila Madalena', 'Vila Madalena', 'Bares, ateliês e estúdios em casas.', 'Bars, workshops and home studios.',
      [[1990, 0.3, 'Estudantes e artistas em casinhas baratas.', 'Students and artists in cheap little houses.'], [2000, 0.55, 'Bares lotados e grafite no Beco do Batman.', 'Packed bars and graffiti in Beco do Batman.'], [2012, 0.8, 'Prédios novos e aluguel de bairro nobre.', 'New towers and upmarket rents.']])],
  tokyo: [h(0, 1960, 'Ginza', 'Ginza', 'Cafés com vitrola e salões de dança.', 'Record-player cafés and dance halls.',
      [[1900, 0.6], [1928, 0.72, 'Moga e mobo: cafés com vitrola e salões de dança.', 'Moga and mobo: gramophone cafés and dance halls.'], [1945, 0.2, 'O bairro é bombardeado na guerra.', 'The district is bombed in the war.'], [1955, 0.6, 'Reconstrução: lojas de departamento e clubes de jazz.', 'Rebuilt: department stores and jazz clubs.']]),
    h(1960, 1990, 'Shinjuku', 'Shinjuku', 'Cafés de jazz e casas de rock.', 'Jazz cafés and rock houses.',
      [[1960, 0.35, 'Cafés de jazz e bares minúsculos no Golden Gai.', 'Jazz cafés and tiny bars in Golden Gai.'], [1969, 0.38, 'Contracultura: folk e protestos na praça da estação.', 'Counterculture: folk and protests at the station plaza.'], [1980, 0.62], [1988, 0.86, 'Bolha imobiliária: arranha-céus e aluguéis recordes.', 'Property bubble: skyscrapers and record rents.']]),
    h(1990, 9999, 'Shimokitazawa', 'Shimokitazawa', 'Casas de show pequenas, brechós e bandas indie.', 'Small live houses, thrift shops and indie bands.',
      [[1990, 0.38, 'Live houses minúsculas e brechós; aluguel acessível.', 'Tiny live houses and thrift shops; affordable rent.'], [2003, 0.48], [2013, 0.62, 'A linha férrea vai para o subsolo e o bairro é redesenhado.', 'The railway goes underground and the area is redesigned.'], [2022, 0.74]])],
  paris: [h(0, 1940, 'Montmartre', 'Montmartre', 'Cabarés, pintores e acordeões.', 'Cabarets, painters and accordions.',
      [[1885, 0.2, 'O Chat Noir e ateliês baratos no morro.', 'Le Chat Noir and cheap studios on the hill.'], [1905, 0.3, 'Pintores no Bateau-Lavoir.', 'Painters in the Bateau-Lavoir.'], [1920, 0.55, 'Cabarés para turistas; artistas fogem para Montparnasse.', 'Tourist cabarets; artists flee to Montparnasse.'], [1935, 0.6]]),
    h(1940, 1970, 'Saint-Germain-des-Prés', 'Saint-Germain-des-Prés', 'Cafés literários e caves.', 'Literary cafés and cellars.',
      [[1940, 0.35, 'Ocupação: cafés frios e racionamento.', 'Occupation: cold cafés and rationing.'], [1947, 0.45, 'Caves de jazz e existencialistas.', 'Jazz cellars and existentialists.'], [1956, 0.65], [1966, 0.8, 'Butiques de moda substituem as caves.', 'Fashion boutiques replace the cellars.']]),
    h(1970, 2000, 'Pigalle', 'Pigalle', 'Lojas de instrumentos e clubes noturnos.', 'Instrument shops and night clubs.',
      [[1970, 0.3], [1985, 0.2, 'Neon, sex shops e lojas de guitarra na Rue de Douai.', 'Neon, sex shops and guitar stores on Rue de Douai.'], [1998, 0.3]]),
    h(2000, 9999, 'Belleville', 'Belleville', 'Bares, grafite e estúdios baratos (por pouco tempo).', 'Bars, graffiti and cheap studios (for now).',
      [[2000, 0.2, 'Ateliês baratos e bares populares.', 'Cheap studios and working-class bars.'], [2010, 0.42], [2020, 0.56, 'Bares de vinho natural e aluguel em alta.', 'Natural-wine bars and climbing rents.']])],
  berlin: [h(0, 1961, 'Friedrichstraße', 'Friedrichstraße', 'Cabarés e salões de variedades.', 'Cabarets and variety halls.',
      [[1900, 0.6], [1925, 0.72, 'Os Anos Dourados: cabarés e revistas lotadas.', 'The Golden Twenties: cabarets and revues packed.'], [1933, 0.5, 'O nazismo fecha cabarés e persegue artistas.', 'The Nazis shut cabarets and persecute artists.'], [1945, 0.08, 'Ruínas da guerra.', 'War ruins.'], [1955, 0.18]]),
    h(1961, 2005, 'Kreuzberg', 'Kreuzberg', 'Prédios velhos e aluguel barato à sombra do Muro.', 'Old buildings and cheap rent in the shadow of the Wall.',
      [[1961, 0.05, 'O Muro corta o bairro: prédios vazios.', 'The Wall cuts the area off: empty buildings.'], [1975, 0.08, 'Ocupações e estúdios em fábricas.', 'Squats and studios in factories.'], [1979, 0.1, 'Punk no SO36.', 'Punk at SO36.'], [1991, 0.25, 'O Muro caiu: Kreuzberg fica no centro de novo.', 'The Wall has fallen: Kreuzberg is central again.'], [2003, 0.42]]),
    h(2005, 9999, 'Friedrichshain', 'Friedrichshain', 'Clubes de techno em usinas antigas.', 'Techno clubs in old power plants.',
      [[2005, 0.3, 'Clubes de techno em usinas e galpões.', 'Techno clubs in power plants and warehouses.'], [2012, 0.55], [2020, 0.75, 'Escritórios e condomínios cercam os clubes.', 'Offices and condos surround the clubs.']])],
  los_angeles: [h(0, 1960, 'Hollywood', 'Hollywood', 'Estúdios de cinema e de discos lado a lado.', 'Film and record studios side by side.',
      [[1900, 0.3], [1915, 0.42, 'Os estúdios de cinema chegam aos laranjais.', 'Film studios arrive among the orange groves.'], [1930, 0.7], [1956, 0.65, 'A torre da Capitol Records.', 'The Capitol Records tower.']]),
    h(1960, 1990, 'Sunset Strip', 'Sunset Strip', 'Clubes de rock e outdoors gigantes.', 'Rock clubs and giant billboards.',
      [[1960, 0.5], [1966, 0.4, 'Whisky a Go Go e protestos jovens na Strip.', 'Whisky a Go Go and youth riots on the Strip.'], [1975, 0.55], [1985, 0.62, 'Hair metal e outdoors de discos gigantes.', 'Hair metal and giant record billboards.']]),
    h(1990, 9999, 'Silver Lake', 'Silver Lake', 'Cena indie, cafés e casas com estúdio.', 'Indie scene, cafés and houses with studios.',
      [[1990, 0.25, 'Casas baratas na colina e bares indie.', 'Cheap hillside houses and indie bars.'], [2000, 0.45], [2010, 0.7, 'Cafés caros e casas de milhões.', 'Pricey cafés and million-dollar homes.'], [2020, 0.86]])],
  nashville: [h(0, 1955, 'Lower Broadway', 'Lower Broadway', 'Salões e teatros perto do rio.', 'Halls and theatres by the river.',
      [[1895, 0.35], [1943, 0.42, 'O Grand Ole Opry vai para o Ryman; honky-tonks enchem a rua.', 'The Grand Ole Opry moves to the Ryman; honky-tonks fill the street.']]),
    h(1955, 9999, 'Music Row', 'Music Row', 'Casas viraram editoras e estúdios.', 'Houses turned into publishers and studios.',
      [[1955, 0.2, 'Casas velhas e baratas viram estúdios (o Quonset Hut).', 'Cheap old houses become studios (the Quonset Hut).'], [1965, 0.45, 'O "Nashville sound": editoras em todas as casas.', 'The "Nashville sound": publishers in every house.'], [1985, 0.55], [2000, 0.62], [2015, 0.86, 'Condomínios derrubam estúdios históricos.', 'Condos replace historic studios.']])],
  memphis: [h(0, 9999, 'Beale Street', 'Beale Street', 'Clubes, teatros e lojas de penhor.', 'Clubs, theatres and pawn shops.',
      [[1900, 0.42], [1912, 0.45, 'W. C. Handy publica o "Memphis Blues".', 'W. C. Handy publishes "Memphis Blues".'], [1948, 0.38, 'Blues elétrico e a WDIA no ar.', 'Electric blues and WDIA on the air.'], [1960, 0.2], [1970, 0.05, 'Renovação urbana: quarteirões demolidos e vazios.', 'Urban renewal: blocks demolished and empty.'], [1983, 0.18, 'A rua reabre como distrito de entretenimento.', 'The street reopens as an entertainment district.'], [1995, 0.5], [2010, 0.55]])],
  new_orleans: [h(0, 1897, 'Tremé', 'Tremé', 'Bandas de metais e salões de dança perto da Congo Square.', 'Brass bands and dance halls near Congo Square.',
      [[1885, 0.2]]),
    h(1897, 1917, 'Storyville', 'Storyville', 'Salões onde o jazz nasceu.', 'Halls where jazz was born.',
      [[1897, 0.4, 'A zona de Storyville é criada por lei.', 'Storyville is created by ordinance.'], [1910, 0.45]]),
    h(1917, 9999, 'French Quarter', 'French Quarter', 'Bandas de metais nas esquinas.', 'Brass bands on every corner.',
      [[1917, 0.2, 'Storyville é fechada; o Quarter é um cortiço barato.', 'Storyville is closed; the Quarter is a cheap slum.'], [1940, 0.3], [1961, 0.5, 'O Preservation Hall abre.', 'Preservation Hall opens.'], [1980, 0.65], [2006, 0.6, 'Depois do Katrina, músicos lutam para voltar.', 'After Katrina, musicians struggle to return.'], [2015, 0.8, 'Aluguéis de temporada expulsam moradores.', 'Short-term rentals push residents out.']])],
  detroit: [h(0, 1920, 'Woodward Avenue', 'Woodward Avenue', 'Teatros e salões no centro industrial.', 'Theatres and halls in the industrial downtown.',
      [[1900, 0.45]]),
    h(1920, 1959, 'Paradise Valley', 'Paradise Valley', 'Clubes de jazz e blues.', 'Jazz and blues clubs.',
      [[1920, 0.3], [1940, 0.48, 'Clubes de jazz lotados em Hastings Street.', 'Jazz clubs packed on Hastings Street.'], [1955, 0.22, 'A autoestrada derruba o bairro.', 'The freeway tears through the area.']]),
    h(1959, 9999, 'West Grand Boulevard', 'West Grand Boulevard', 'Casas-estúdio e linha de montagem de hits.', 'House studios and a hit assembly line.',
      [[1959, 0.2, 'Uma casa barata vira o "Hitsville U.S.A.".', 'A cheap house becomes "Hitsville U.S.A.".'], [1967, 0.25, 'A revolta de 1967 a poucas quadras.', 'The 1967 uprising a few blocks away.'], [1972, 0.1, 'A Motown vai para Los Angeles.', 'Motown moves to Los Angeles.'], [1990, 0.05], [2015, 0.2], [2022, 0.3]])],
  chicago: [h(0, 1930, 'The Stroll', 'The Stroll', 'Clubes e salões na State Street.', 'Clubs and halls on State Street.',
      [[1910, 0.35], [1922, 0.48, 'Jazz de Nova Orleans chega aos clubes da State Street.', 'New Orleans jazz reaches State Street\'s clubs.']]),
    h(1930, 1955, 'Bronzeville', 'Bronzeville', 'Blues elétrico e salões de baile.', 'Electric blues and ballrooms.',
      [[1930, 0.38], [1945, 0.32, 'Blues elétrico nos clubes; prédios superlotados.', 'Electric blues in the clubs; overcrowded buildings.'], [1952, 0.2]]),
    h(1955, 1975, 'Record Row', 'Record Row', 'Gravadoras e distribuidoras na S. Michigan Ave.', 'Labels and distributors on S. Michigan Ave.',
      [[1955, 0.35], [1965, 0.42, 'A Chess grava na 2120 S. Michigan.', 'Chess records at 2120 S. Michigan.'], [1972, 0.2]]),
    h(1975, 9999, 'Wicker Park', 'Wicker Park', 'Bares, lofts e aluguel barato.', 'Bars, lofts and cheap rent.',
      [[1975, 0.1], [1985, 0.2, 'Artistas e house music em lofts baratos.', 'Artists and house music in cheap lofts.'], [1993, 0.45, 'Capital do rock alternativo.', 'Alternative-rock capital.'], [2000, 0.7], [2010, 0.85]])],
  liverpool: [h(0, 9999, 'Mathew Street', 'Mathew Street', 'Porões, armazéns e o porto.', 'Cellars, warehouses and the docks.',
      [[1900, 0.35], [1957, 0.15, 'O Cavern abre num armazém de frutas.', 'The Cavern opens in a fruit warehouse.'], [1963, 0.45, 'Merseybeat: fila na porta do Cavern.', 'Merseybeat: a queue outside the Cavern.'], [1973, 0.1, 'O Cavern fecha; o porto entra em declínio.', 'The Cavern closes; the docks decline.'], [1984, 0.2], [2000, 0.45], [2010, 0.6]])],
  manchester: [h(0, 9999, 'Northern Quarter', 'Northern Quarter', 'Armazéns de algodão e oficinas.', 'Cotton warehouses and workshops.',
      [[1900, 0.42], [1960, 0.15], [1982, 0.1, 'A Factory e o Haçienda: clubes em armazéns vazios.', 'Factory and the Haçienda: clubs in empty warehouses.'], [1995, 0.3], [2005, 0.55], [2015, 0.75, 'Lofts caros e bares de coquetel.', 'Pricey lofts and cocktail bars.']])],
  kingston: [h(0, 9999, 'Orange Street', 'Orange Street', 'Lojas, oficinas e o centro velho.', 'Shops, workshops and the old downtown.',
      [[1900, 0.3], [1958, 0.3, 'A "Beat Street": lojas de disco e sound systems.', '"Beat Street": record shops and sound systems.'], [1976, 0.15, 'Violência política esvazia o centro.', 'Political violence empties downtown.'], [1990, 0.1]])],
  buenos_aires: [h(0, 1960, 'Abasto', 'Abasto', 'Tango no mercado e nos cafés.', 'Tango in the market and the cafés.',
      [[1895, 0.3], [1930, 0.42, 'Gardel canta nos cafés do mercado.', 'Gardel sings in the market cafés.'], [1950, 0.3]]),
    h(1960, 9999, 'San Telmo', 'San Telmo', 'Casarões, feiras e milongas.', 'Old houses, fairs and milongas.',
      [[1960, 0.1, 'Casarões viram cortiços baratos.', 'Mansions turned into cheap tenements.'], [1970, 0.2, 'A feira de antiguidades da Plaza Dorrego.', 'The Plaza Dorrego antiques fair.'], [1990, 0.3], [2005, 0.55], [2015, 0.6]])],
  havana: [h(0, 9999, 'Vedado', 'Vedado', 'Hotéis, cabarés e orquestras.', 'Hotels, cabarets and orchestras.',
      [[1920, 0.55], [1930, 0.62, 'O Hotel Nacional abre.', 'The Hotel Nacional opens.'], [1950, 0.82, 'Cassinos e cabarés da máfia.', 'Mob casinos and cabarets.'], [1959, 0.5, 'Revolução: cassinos fechados.', 'Revolution: casinos shut.'], [1962, 0.25], [1991, 0.1, 'Período especial: apagões e escassez.', 'Special Period: blackouts and shortages.'], [2015, 0.3]])],
  seattle: [h(0, 9999, 'Capitol Hill', 'Capitol Hill', 'Casarões, bares e garagens.', 'Mansions, bars and garages.',
      [[1910, 0.6], [1960, 0.3], [1985, 0.2], [1991, 0.32, 'Grunge: bandas em garagens e bares baratos.', 'Grunge: bands in garages and cheap bars.'], [2000, 0.5], [2012, 0.75, 'O dinheiro da tecnologia chega.', 'Tech money arrives.'], [2020, 0.86]])],
};
const GEN19: Hood19[] = [
  h(0, 1950, 'Centro antigo', 'Old downtown', 'Teatros, rádios e lojas de partitura.', 'Theatres, radio stations and sheet-music shops.', [[1900, 0.5], [1945, 0.35]]),
  h(1950, 1990, 'Bairro boêmio', 'Bohemian quarter', 'Bares com palco, gráficas e aluguel barato.', 'Bars with stages, print shops and cheap rent.', [[1950, 0.15], [1985, 0.5]]),
  h(1990, 9999, 'Distrito criativo', 'Creative district', 'Galpões reformados, cafés e aluguel em alta.', 'Refurbished warehouses, cafés and rising rents.', [[1990, 0.4], [2025, 0.85]]),
];
export const hoodAt19 = (city: string, year: number): Hood19 => { const xs = HOODS19[city] ?? GEN19; return xs.find((x) => year >= x.from && year < x.to) ?? xs[xs.length - 1]; };

/** Gentrificação histórica (0..1) do bairro no ano: interpola a linha do tempo documentada. */
export function histAge19(x: Hood19, year: number): number {
  const k = x.k;
  if (year <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (year < k[i][0]) { const [y0, a0] = k[i - 1], [y1, a1] = k[i]; return a0 + ((a1 - a0) * (year - y0)) / (y1 - y0); }
  return k[k.length - 1][1];
}
/** Nota da época: a mais recente com ano ≤ year (nada do futuro). */
export function histNote19(x: Hood19, year: number): L | null {
  let n: Kf19 | null = null;
  for (const p of x.k) if (p[0] <= year && p[2]) n = p;
  return n ? l(n[2]!, n[3] ?? n[2]!) : null;
}

/** Clima: probabilidade extra de chuva (0..1) e se neva no inverno. */
export const CLIMATE19: Record<string, { rain: number; snow?: boolean; sun?: boolean }> = {
  london: { rain: 0.6 }, manchester: { rain: 0.7 }, liverpool: { rain: 0.6 }, dublin: { rain: 0.65 }, seattle: { rain: 0.65 }, vancouver: { rain: 0.6 },
  rio: { rain: 0.15, sun: true }, los_angeles: { rain: 0.05, sun: true }, miami: { rain: 0.3, sun: true }, havana: { rain: 0.2, sun: true }, kingston: { rain: 0.2, sun: true },
  salvador: { rain: 0.2, sun: true }, sydney: { rain: 0.2, sun: true }, cairo: { rain: 0.02, sun: true }, las_vegas: { rain: 0.02, sun: true }, mexico_city: { rain: 0.3 },
  new_york: { rain: 0.3, snow: true }, chicago: { rain: 0.3, snow: true }, detroit: { rain: 0.3, snow: true }, boston: { rain: 0.3, snow: true }, toronto: { rain: 0.3, snow: true },
  montreal: { rain: 0.3, snow: true }, moscow: { rain: 0.3, snow: true }, stockholm: { rain: 0.35, snow: true }, berlin: { rain: 0.35, snow: true },
};
