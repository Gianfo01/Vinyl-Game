// Rodada 14 — EUA e Canadá (extras). Ver h.ts para o formato.
import { bd, so } from './h';

export const MORE_NA = [
  // ——— hip hop / r&b ———
  so('Ice Cube', 'gfunk', 'los_angeles', 'USA', 1990, 0, 2, 1, 1969, 0, 'm', ['AmeriKKKa\'s Most Wanted|1990', 'Death Certificate|1991']),
  so('T.I.', 'trap', 'atlanta', 'USA', 2001, 0, 2, 2, 1980, 0, 'm', ['I\'m Serious|2001', 'Trap Muzik|2003']),
  so('Young Jeezy', 'trap', 'atlanta', 'USA', 2005, 0, 2, 3, 1977, 0, 'm', ['Let\'s Get It: Thug Motivation 101|2005']),
  so('Megan Thee Stallion', 'trap', 'houston', 'USA', 2019, 0, 1, 2, 1995, 0, 'm', ['Fever|2019']),
  so('Chance the Rapper', 'hiphop', 'chicago', 'USA', 2013, 0, 2, 2, 1993, 0, 'm', ['Acid Rap|2013']),
  so('Lizzo', 'hiphop', 'minneapolis', 'USA', 2013, 0, 2, 2, 1988, 0, 'm', ['Lizzobangers|2013', 'Cuz I Love You|2019']),
  so('Janelle Monáe', 'pop_rnb', 'atlanta', 'USA', 2007, 0, 2, 2, 1985, 0, 'v', ['Metropolis: The Chase Suite|2007', 'The ArchAndroid|2010']),
  so('Childish Gambino', 'hiphop', 'atlanta', 'USA', 2011, 0, 2, 3, 1983, 0, 'm', ['Camp|2011', 'Awaken, My Love!|2016']),
  so('John Legend', 'neo_soul', 'philadelphia', 'USA', 2004, 0, 2, 2, 1978, 0, 'k', ['Get Lifted|2004']),
  // ——— pop ———
  so('Selena Gomez', 'teen_pop', 'los_angeles', 'USA', 2009, 0, 2, 2, 1992, 0, 'v', ['Kiss & Tell|2009']),
  so('Jennifer Lopez', 'dance_pop', 'new_york', 'USA', 1999, 0, 1, 1, 1969, 0, 'v', ['On the 6|1999', 'J.Lo|2001']),
  so('Pink', 'dance_pop', 'philadelphia', 'USA', 2000, 0, 1, 2, 1979, 0, 'v', ['Can\'t Take Me Home|2000', 'Missundaztood|2001']),
  so('Kesha', 'dance_pop', 'nashville', 'USA', 2009, 0, 2, 3, 1987, 0, 'v', ['Animal|2010']),
  so('Barry Manilow', 'soft_rock', 'new_york', 'USA', 1973, 0, 2, 3, 1943, 0, 'k', ['Barry Manilow II|1974']),
  // ——— rock / pop rock ———
  so('Bobby Darin', 'trad_pop', 'new_york', 'USA', 1956, 1973, 2, 3, 1936, 1973, 'v', ['Mack the Knife|1959|s']),
  so('Pat Benatar', 'arena_rock', 'new_york', 'USA', 1979, 0, 2, 3, 1953, 0, 'v', ['In the Heat of the Night|1979']),
  bd('Toto', 'arena_rock', 'los_angeles', 'USA', 1978, 0, 2, 2, 'David Paich:k:1954|Steve Lukather:g:1957|Jeff Porcaro:d:1954:1992', ['Toto IV|1982']),
  bd('Foreigner', 'arena_rock', 'new_york', 'GBR', 1977, 0, 2, 2, 'Lou Gramm:v:1950|Mick Jones:g:1944|Ian McDonald:g:1946:2022', ['Foreigner|1977', '4|1981']),
  bd('System of a Down', 'nu_metal', 'los_angeles', 'USA', 1998, 0, 1, 2, 'Serj Tankian:v:1967|Daron Malakian:g:1975|Shavo Odadjian:b:1974|John Dolmayan:d:1973', ['System of a Down|1998', 'Toxicity|2001']),
  bd('Panic! at the Disco', 'emo', 'las_vegas', 'USA', 2005, 2023, 2, 2, 'Brendon Urie:v:1987|Ryan Ross:g:1986|Spencer Smith:d:1987|Brent Wilson:b:1986', ['A Fever You Can\'t Sweat Out|2005']),
  bd('Wilco', 'alt_rock', 'chicago', 'USA', 1995, 0, 3, 3, 'Jeff Tweedy:v:1967|John Stirratt:b:1968|Glenn Kotche:d:1970', ['A.M.|1995', 'Yankee Hotel Foxtrot|2002']),
  bd('The National', 'indie', 'new_york', 'USA', 2001, 0, 3, 3, 'Matt Berninger:v:1971|Aaron Dessner:g:1976|Bryce Dessner:g:1976', ['Boxer|2007']),
  bd('Dead Kennedys', 'hardcore_punk', 'san_francisco', 'USA', 1979, 1986, 2, 2, 'Jello Biafra:v:1958|East Bay Ray:g:1958|Klaus Flouride:b:1957|D.H. Peligro:d:1959:2022', ['Fresh Fruit for Rotting Vegetables|1980']),
  bd('Minor Threat', 'hardcore_punk', 'washington', 'USA', 1980, 1983, 3, 2, 'Ian MacKaye:v:1962|Lyle Preslar:g:1963|Brian Baker:g:1965|Jeff Nelson:d:1965', ['Out of Step|1983']),
  bd('Bad Brains', 'hardcore_punk', 'washington', 'USA', 1979, 0, 3, 3, 'H.R.:v:1956|Dr. Know:g:1958|Darryl Jenifer:b:1962|Earl Hudson:d:1958', ['Bad Brains|1982']),
  bd('Pantera', 'heavy_metal', 'houston', 'USA', 1983, 2003, 2, 2, 'Phil Anselmo:v:1968|Dimebag Darrell:g:1966:2004|Rex Brown:b:1964|Vinnie Paul:d:1964:2018', ['Cowboys from Hell|1990', 'Vulgar Display of Power|1992']),
  bd('Poison', 'glam', 'los_angeles', 'USA', 1986, 0, 2, 3, 'Bret Michaels:v:1963|C.C. DeVille:g:1962|Bobby Dall:b:1963|Rikki Rockett:d:1961', ['Look What the Cat Dragged In|1986']),
  bd('Slipknot', 'nu_metal', 'chicago', 'USA', 1999, 0, 2, 2, 'Corey Taylor:v:1973|Mick Thomson:g:1973|Jim Root:g:1971|Joey Jordison:d:1975:2021', ['Slipknot|1999', 'Iowa|2001']),
  bd('Limp Bizkit', 'nu_metal', 'atlanta', 'USA', 1997, 0, 2, 3, 'Fred Durst:v:1970|Wes Borland:g:1975|Sam Rivers:b:1977|John Otto:d:1977', ['Three Dollar Bill, Y\'all$|1997', 'Significant Other|1999']),
  // ——— country ———
  so('George Strait', 'country', 'austin', 'USA', 1981, 0, 1, 2, 1952, 0, 'v', ['Strait Country|1981']),
  so('Alan Jackson', 'country', 'nashville', 'USA', 1989, 0, 2, 2, 1958, 0, 'v', ['Here in the Real World|1990']),
  so('Carrie Underwood', 'country_pop', 'nashville', 'USA', 2005, 0, 1, 2, 1983, 0, 'v', ['Some Hearts|2005']),
  so('Kacey Musgraves', 'country_pop', 'nashville', 'USA', 2013, 0, 2, 2, 1988, 0, 'v', ['Same Trailer Different Park|2013', 'Golden Hour|2018']),
  so('Luke Combs', 'country', 'nashville', 'USA', 2017, 0, 1, 2, 1990, 0, 'v', ['This One\'s for You|2017']),
  so('Kenny Rogers', 'country_pop', 'nashville', 'USA', 1958, 2020, 1, 2, 1938, 2020, 'v', ['The Gambler|1978']),
  so('Brooks & Dunn', 'country', 'nashville', 'USA', 1991, 2010, 2, 3, 1955, 0, 'v', ['Brand New Man|1991']),
  // ——— jazz / blues / soul / funk / disco ———
  so('Duke Ellington', 'big_band', 'new_york', 'USA', 1924, 1974, 1, 1, 1899, 1974, 'k', ['Take the "A" Train|1941|s', 'Ellington at Newport|1956']),
  bd('Weather Report', 'fusion', 'new_york', 'USA', 1971, 1986, 2, 2, 'Joe Zawinul:k:1932:2007|Wayne Shorter:h:1933:2023|Jaco Pastorius:b:1951:1987', ['Weather Report|1971', 'Heavy Weather|1977']),
  so('Pat Metheny', 'fusion', 'kansas_city', 'USA', 1976, 0, 2, 3, 1954, 0, 'g', ['Bright Size Life|1976']),
  so('Kamasi Washington', 'fusion', 'los_angeles', 'USA', 2015, 0, 3, 3, 1981, 0, 'h', ['The Epic|2015']),
  bd('The O\'Jays', 'philly_soul', 'philadelphia', 'USA', 1963, 0, 2, 3, 'Eddie Levert:v:1942:2023|Walter Williams:v:1942:2011', ['Back Stabbers|1972']),
  so('Teddy Pendergrass', 'philly_soul', 'philadelphia', 'USA', 1977, 2010, 2, 3, 1950, 2010, 'v', ['Teddy Pendergrass|1977']),
  bd('Gladys Knight & the Pips', 'soul', 'atlanta', 'USA', 1961, 1989, 2, 3, 'Gladys Knight:v:1944|Merald Knight:v:1942:1999|William Guest:v:1941:2015', ['Imagination|1973']),
  so('Quincy Jones', 'fusion', 'los_angeles', 'USA', 1957, 2024, 2, 2, 1933, 2024, 'p', ['Back on the Block|1989']),
  // ——— eletrônica / outros ———
  so('Derrick May', 'techno', 'detroit', 'USA', 1987, 0, 3, 3, 1963, 0, 'j', ['Strings of Life|1987|s']),
  so('Moby', 'techno', 'new_york', 'USA', 1990, 0, 2, 3, 1965, 0, 'p', ['Play|1999']),
  so('Deadmau5', 'house', 'toronto', 'CAN', 2005, 0, 2, 2, 1981, 0, 'p', ['Get Scraped|2005']),
  so('Diplo', 'edm', 'philadelphia', 'USA', 2004, 0, 2, 3, 1978, 0, 'p', ['Florida|2004']),
  so('Marshmello', 'edm', 'philadelphia', 'USA', 2015, 0, 2, 3, 1992, 0, 'p', ['Joytime|2016']),
  so('Kaskade', 'house', 'chicago', 'USA', 2003, 0, 3, 3, 1971, 0, 'p', ['It\'s You, It\'s Me|2003']),
  // ——— Canadá ———
];
