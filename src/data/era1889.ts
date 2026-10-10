// Rodada 18 (era1889) — dados da era acústica (1889–1919): artistas reais com datas documentadas, gravadoras reais
// nas datas de fundação, produtores/A&R, empresários e empresários de palco, relíquias, imprensa, guerras e crises,
// impérios e populações antes de 1920. Nada aqui inventa fatos: na dúvida o campo ficou vazio (o jogo gera o resto).
// Gravações desta época são acústicas (corneta, sem microfone); cilindro e disco brigam até ~1912.

import type { RealArtist, RealMember } from './realtypes';
import type { ExtraLabel, RealExec } from './labels10';
import type { RealProd } from './producers15';
import type { RealMgr } from './managers14';
import type { RelicDef17 } from '../sim/relics17';
import type { Outlet17 } from './media17';
import { l, type FamilyId, type L } from './world';

const R: Record<string, RealMember[1]> = { v: 'vocal', g: 'guitar', b: 'bass', d: 'drums', k: 'keys', h: 'horns', s: 'strings' };
const al = (a?: string[]): RealArtist['al'] => a?.map((x) => { const [t, y, k] = x.split('|'); return (k ? [t, +y, k === 's' ? 'single' : 'ep'] : [t, +y]) as NonNullable<RealArtist['al']>[number]; });
/** solo: nome, gênero, cidade, país, estreia, fim (0 = ativo até morrer), fama t, nascimento, morte, papel, obras "Título|ano|s" */
const so = (n: string, g: string, c: string, cn: string, d: number, e: number, t: 1 | 2 | 3, b: number, x: number, r: string, a?: string[]): RealArtist =>
  ({ n, g, c, cn, d, ...(e ? { e } : {}), t, b, ...(x ? { x } : {}), r: R[r], ...(a ? { al: al(a) } : {}) });
/** grupo: "Nome:papel[:nasc[:morte[:entrou[:saiu]]]]" */
const gr = (n: string, g: string, c: string, cn: string, d: number, e: number, t: 1 | 2 | 3, m: string, a?: string[]): RealArtist =>
  ({ n, g, c, cn, d, ...(e ? { e } : {}), t, m: m.split('|').map((x) => { const p = x.split(':'); const v = (i: number) => (p[i] && p[i] !== '0' ? +p[i] : undefined); return [p[0], R[p[1]], v(2), v(3), v(4), v(5)] as RealMember; }), ...(a ? { al: al(a) } : {}) });

/** Artistas reais 1889–1919 (entram no fim de REAL_ALL; catalogNo estável). */
export const REAL_1889: RealArtist[] = [
  // EUA — os primeiros astros do cilindro (Columbia, Washington, 1889–90)
  so('Len Spencer', 'vaudeville', 'washington', 'USA', 1889, 1914, 3, 1867, 1914, 'v'),
  so('John Yorke AtLee', 'parlor_song', 'washington', 'USA', 1889, 1900, 3, 1853, 1910, 'v'),
  so('George W. Johnson', 'vaudeville', 'new_york', 'USA', 1890, 1910, 3, 1846, 1914, 'v', ['The Laughing Song|1890|s']),
  gr("Sousa's Band", 'march', 'new_york', 'USA', 1892, 1931, 1, 'John Philip Sousa:h:1854:1932|Arthur Pryor:h:1870:1942:1892:1903|Herbert L. Clarke:h:1867:1945:1893:1917',
    ['The Washington Post March|1893|s', 'El Capitan March|1896|s', 'The Stars and Stripes Forever|1897|s']),
  so('Vess L. Ossman', 'ragtime', 'new_york', 'USA', 1893, 1917, 3, 1868, 1923, 's'),
  gr('Haydn Quartet', 'barbershop', 'new_york', 'USA', 1898, 1914, 3, 'Harry Macdonough:v:1871:1931|John Bieling:v:1869:1948|S. H. Dudley:v|William F. Hooley:v', ['Sweet Adeline|1904|s', 'Take Me Out to the Ball Game|1908|s']),
  so('Scott Joplin', 'ragtime', 'kansas_city', 'USA', 1899, 1917, 1, 1868, 1917, 'k', ['Maple Leaf Rag (partitura)|1899|s', 'The Entertainer (partitura)|1902|s', 'Treemonisha|1911', 'Maple Leaf Rag (rolo de pianola)|1916|s']),
  so('Bert Williams', 'vaudeville', 'new_york', 'USA', 1901, 1922, 2, 1874, 1922, 'v', ['Nobody|1906|s']),
  gr('Collins & Harlan', 'vaudeville', 'new_york', 'USA', 1901, 1918, 3, 'Arthur Collins:v:1864:1933|Byron G. Harlan:v:1861:1936', ["Alexander's Ragtime Band|1911|s"]),
  so('Billy Murray', 'tin_pan_alley', 'new_york', 'USA', 1903, 1943, 2, 1877, 1954, 'v', ['Meet Me in St. Louis, Louis|1904|s', "Give My Regards to Broadway|1905|s", 'Over There|1917|s']),
  so('Henry Burr', 'parlor_song', 'new_york', 'CAN', 1903, 1929, 3, 1882, 1941, 'v'),
  so('Ada Jones', 'tin_pan_alley', 'new_york', 'USA', 1904, 1922, 2, 1873, 1922, 'v', ['Shine On, Harvest Moon|1909|s']),
  so('Nora Bayes', 'vaudeville', 'new_york', 'USA', 1908, 1928, 2, 1880, 1928, 'v', ['Over There|1917|s']),
  gr('Fisk Jubilee Singers', 'spirituals', 'nashville', 'USA', 1909, 0, 2, 'John Wesley Work II:v:1872:1925', ['Swing Low, Sweet Chariot|1909|s']),
  so('Al Jolson', 'vaudeville', 'new_york', 'USA', 1911, 1950, 1, 1886, 1950, 'v', ['That Haunting Melody|1911|s', 'Rock-a-Bye Your Baby with a Dixie Melody|1918|s']),
  so('W. C. Handy', 'classic_blues', 'memphis', 'USA', 1912, 1958, 2, 1873, 1958, 'h', ['The Memphis Blues (partitura)|1912|s', 'St. Louis Blues (partitura)|1914|s']),
  so('James Reese Europe', 'ragtime', 'new_york', 'USA', 1913, 1919, 2, 1880, 1919, 'k', ['Too Much Mustard|1913|s', 'Castle Walk|1914|s']),
  gr('Original Dixieland Jass Band', 'nola_jazz', 'new_orleans', 'USA', 1917, 1925, 2, 'Nick LaRocca:h:1889:1961|Larry Shields:h:1893:1953|Eddie Edwards:h:1891:1963|Henry Ragas:k:1891:1919:0:1919|Tony Sbarbaro:d:1897:1969',
    ['Livery Stable Blues|1917|s', 'Tiger Rag|1918|s']),
  so('Abe Schwartz', 'klezmer', 'new_york', 'USA', 1917, 1930, 3, 1881, 1963, 's'),
  // ópera e clássica (o disco ganha prestígio)
  so('Enrico Caruso', 'opera', 'milan', 'ITA', 1902, 1921, 1, 1873, 1921, 'v', ['Questa o quella (Milão, Gaisberg)|1902|s', 'Vesti la giubba|1907|s', "'O sole mio|1916|s", 'Over There|1918|s']),
  so('Alessandro Moreschi', 'classical', 'rome', 'ITA', 1902, 1913, 3, 1858, 1922, 'v'),
  so('Feodor Chaliapin', 'opera', 'st_petersburg', 'RUS', 1901, 1936, 2, 1873, 1938, 'v'),
  so('Nellie Melba', 'opera', 'london', 'AUS', 1904, 1926, 2, 1861, 1931, 'v'),
  so('Fritz Kreisler', 'classical', 'vienna', 'AUT', 1904, 1950, 2, 1875, 1962, 's'),
  so('John McCormack', 'opera', 'dublin', 'IRL', 1904, 1938, 2, 1884, 1945, 'v', ["It's a Long Way to Tipperary|1914|s"]),
  // music hall e cabaré (Europa)
  so('Dan Leno', 'vaudeville', 'london', 'GBR', 1885, 1904, 3, 1860, 1904, 'v'),
  so('Marie Lloyd', 'vaudeville', 'london', 'GBR', 1885, 1922, 2, 1870, 1922, 'v'),
  so('Harry Lauder', 'vaudeville', 'glasgow', 'GBR', 1902, 1935, 2, 1870, 1950, 'v', ["Roamin' in the Gloamin'|1911|s"]),
  so('Aristide Bruant', 'cabaret', 'paris', 'FRA', 1885, 1913, 3, 1851, 1925, 'v'),
  so('Yvette Guilbert', 'cabaret', 'paris', 'FRA', 1890, 1940, 2, 1865, 1944, 'v'),
  so('Mistinguett', 'cabaret', 'paris', 'FRA', 1897, 1951, 2, 1875, 1956, 'v'),
  so('Antonio Chacón', 'flamenco', 'sevilla', 'ESP', 1889, 1929, 3, 1869, 1929, 'v'),
  so('La Niña de los Peines', 'flamenco', 'sevilla', 'ESP', 1910, 1950, 2, 1890, 1969, 'v'),
  // Brasil — Casa Edison (1902), choro, maxixe e o primeiro samba gravado
  so('Chiquinha Gonzaga', 'maxixe', 'rio', 'BRA', 1889, 1935, 2, 1847, 1935, 'k', ['Ó Abre Alas (partitura)|1899|s']),
  so('Ernesto Nazareth', 'choro', 'rio', 'BRA', 1893, 1932, 2, 1863, 1934, 'k', ['Brejeiro (partitura)|1893|s', 'Odeon (partitura)|1909|s']),
  so('Anacleto de Medeiros', 'march', 'rio', 'BRA', 1902, 1907, 3, 1866, 1907, 'h'),
  so('Bahiano', 'modinha', 'rio', 'BRA', 1902, 1925, 2, 1870, 1944, 'v', ['Isto É Bom|1902|s', 'Pelo Telefone|1917|s']),
  so('Donga', 'samba', 'rio', 'BRA', 1917, 1974, 2, 1890, 1974, 'g', ['Pelo Telefone (partitura)|1917|s']),
  // Prata, Caribe, Índia, Oriente Médio
  so('Ángel Villoldo', 'tango', 'buenos_aires', 'ARG', 1903, 1919, 3, 1861, 1919, 'v', ['El Choclo|1903|s']),
  so('Gauhar Jaan', 'indian_classical', 'kolkata', 'IND', 1902, 1930, 2, 1873, 1930, 'v'),
  so('Salama Hijazi', 'arabic_classical', 'cairo', 'EGY', 1905, 1917, 3, 1852, 1917, 'v'),
];

const x = (id: string, name: string, real: string, pt: string, en: string, city: string, founded: number, family: ExtraLabel['family'], focus: string[], playbook: string): ExtraLabel =>
  ({ id, name, real, archetype: l(pt, en), city, founded, family, focus, playbook });

/** Gravadoras reais da era acústica (fundação real). Fim/fusões reais: LABEL_FATES_1889 (modo exato). */
export const LABELS_1889: ExtraLabel[] = [
  x('x_napc', 'Fonógrafo Norte-Americano', 'North American Phonograph Co.', 'Arrenda fonógrafos a escritórios e salões de moedas', 'Leases phonographs to offices and coin-in-the-slot parlors', 'new_york', 1888, 'B', ['pop'], 'tech'),
  x('x_columbia_ph', 'Grafofone Colúmbia', 'Columbia Phonograph Co.', 'Cilindros de banda, discursos e comédia; depois discos dos dois lados', 'Band, speech and comedy cylinders; later double-sided discs', 'washington', 1889, 'A', ['pop'], 'conglomerate'),
  x('x_pathe', 'Irmãos Pathé', 'Pathé Frères', 'Cilindros e discos de agulha de safira; cinema no mesmo grupo', 'Cylinders and sapphire-stylus discs; film in the same group', 'paris', 1894, 'B', ['europe', 'sacred'], 'tech'),
  x('x_berliner', 'Gramofone Berliner', 'Berliner Gramophone Co.', 'O disco plano contra o cilindro: barato de copiar', 'The flat disc against the cylinder: cheap to copy', 'philadelphia', 1895, 'B', ['pop'], 'tech'),
  x('x_edison', 'Fonógrafo Nacional Edison', 'National Phonograph Co. (Edison Records)', 'O inventor fiel ao cilindro; som limpo, catálogo careta', 'The inventor loyal to the cylinder; clean sound, prim catalog', 'new_york', 1896, 'B', ['pop', 'sacred'], 'purist'),
  x('x_gramophone', 'Companhia do Gramofone', 'The Gramophone Company (HMV)', 'Grava o mundo inteiro: Gaisberg viaja de Milão a Calcutá', 'Records the whole world: Gaisberg travels from Milan to Calcutta', 'london', 1897, 'A', ['sacred', 'europe'], 'importer'),
  x('x_dg', 'Gramofone Alemão', 'Deutsche Grammophon', 'Filial alemã do gramofone: clássica e prensagem em escala', 'German gramophone branch: classical and large-scale pressing', 'hamburg', 1898, 'B', ['sacred', 'europe'], 'prestige'),
  x('x_casa_edison', 'Casa Edison do Rio', 'Casa Edison (Fred Figner)', 'Loja de novidades que grava o primeiro disco brasileiro (1902)', 'Novelty shop that cuts the first Brazilian record (1902)', 'rio', 1900, 'B', ['brazil'], 'regional'),
  x('x_victor', 'Máquina Falante Vitória', 'Victor Talking Machine Co.', 'Prestígio do selo vermelho: Caruso, Red Seal e a Victrola', 'Red Seal prestige: Caruso and the Victrola', 'philadelphia', 1901, 'A', ['sacred', 'pop'], 'prestige'),
  x('x_odeon', 'Odeão Internacional', 'Odeon (International Talking Machine)', 'Disco dos dois lados e filiais pelo mundo', 'Double-sided discs and branches worldwide', 'berlin', 1903, 'B', ['europe'], 'importer'),
  x('x_fonotipia', 'Fonotipia de Milão', 'Società Italiana di Fonotipia', 'Selo de ópera de luxo para colecionadores', 'Luxury opera label for collectors', 'milan', 1904, 'C', ['sacred'], 'prestige'),
  x('x_glucksmann', 'Discos Nacionais do Prata', 'Discos Nacional (Max Glücksmann)', 'Grava tango e payadores no Rio da Prata', 'Records tango and payadores on the River Plate', 'buenos_aires', 1907, 'B', ['latin'], 'regional'),
  x('x_brunswick', 'Discos Brunswick', 'Brunswick', 'Fabricante de mesas de bilhar que entra no disco', 'Billiard-table maker that moves into records', 'chicago', 1916, 'B', ['pop'], 'copycat'),
  x('x_gennett', 'Discos Gennett', 'Gennett Records', 'Fábrica de pianos que grava quem as majors ignoram', 'Piano maker that records whoever the majors ignore', 'chicago', 1917, 'C', ['blues_jazz'], 'scene'),
  x('x_okeh', 'Discos Okeh', 'Okeh Records', 'Disco barato e independente; logo descobre o mercado negro', 'Cheap independent discs; soon finds the Black market', 'new_york', 1918, 'C', ['blues_jazz', 'pop'], 'agitator'),
];

const e = (rid: string, name: string, born: number, died: number | undefined, label: string, y: number, bg: string, style: string, pt: string, en: string): RealExec =>
  ({ rid, name, born, died, label, y, bg, style, pt, en });
export const EXECS_1889: RealExec[] = [
  e('edward_easton', 'Edward D. Easton', 1856, 1915, 'x_columbia_ph', 1889, 'journalist', 'dealmaker', 'Taquígrafo de tribunal que viu no fonógrafo uma máquina de música, não de escritório.', 'Court stenographer who saw the phonograph as a music machine, not an office tool.'),
  e('charles_pathe', 'Charles Pathé', 1863, 1957, 'x_pathe', 1894, 'promoter', 'showman', 'Mostrava fonógrafos em feiras antes de montar um império de discos e cinema.', 'Showed phonographs at fairs before building a record and film empire.'),
  e('emile_berliner', 'Emile Berliner', 1851, 1929, 'x_berliner', 1895, 'engineer', 'visionary', 'Inventor do gramofone e do disco plano copiável por prensagem.', 'Inventor of the gramophone and the pressable flat disc.'),
  e('thomas_edison', 'Thomas Edison', 1847, 1931, 'x_edison', 1896, 'engineer', 'autocrat', 'Inventor do fonógrafo (1877); escolhia pessoalmente o repertório — e odiava jazz.', 'Inventor of the phonograph (1877); chose the repertoire himself — and hated jazz.'),
  e('william_barry_owen', 'William Barry Owen', 1860, 1914, 'x_gramophone', 1897, 'promoter', 'dealmaker', 'Levou o gramofone de Berliner para Londres e comprou a pintura do cachorro Nipper.', 'Took Berliner\'s gramophone to London and bought the Nipper painting.'),
  e('fred_figner', 'Fred Figner', 1866, 1947, 'x_casa_edison', 1900, 'promoter', 'showman', 'Imigrante tcheco que exibia fonógrafos pelo Brasil e gravou os primeiros discos do país.', 'Czech immigrant who toured Brazil showing phonographs and cut the country\'s first records.'),
  e('eldridge_johnson', 'Eldridge R. Johnson', 1867, 1945, 'x_victor', 1901, 'engineer', 'numbers', 'Mecânico de Camden que fez o motor de mola do gramofone e fundou a Victor.', 'Camden machinist who built the gramophone\'s spring motor and founded Victor.'),
  e('max_glucksmann', 'Max Glücksmann', 1875, 1946, 'x_glucksmann', 1907, 'promoter', 'dealmaker', 'Empresário austríaco do Prata: discos, cinemas e concursos de tango.', 'Austrian-born River Plate entrepreneur: records, cinemas and tango contests.'),
];

/** Fusões e fechamentos reais (aplicados só no modo exato; nos outros, a história segue aleatória). */
export const LABEL_FATES_1889: { id: string; y: number; into?: string; pt: string; en: string }[] = [
  { id: 'x_napc', y: 1894, pt: 'A North American Phonograph quebra: o arrendamento de fonógrafos não paga as contas.', en: 'North American Phonograph goes bust: leasing phonographs does not pay the bills.' },
  { id: 'x_berliner', y: 1900, into: 'x_victor', pt: 'Uma liminar tira Berliner do mercado americano; suas patentes vão parar na Victor.', en: 'An injunction pushes Berliner out of the US market; his patents end up with Victor.' },
  { id: 'x_fonotipia', y: 1911, into: 'x_odeon', pt: 'A Fonotipia passa ao grupo Lindström/Odeon.', en: 'Fonotipia passes to the Lindström/Odeon group.' },
];

const P = (id: string, name: string, born: number, died: number, city: string, studio: string, from: number, to: number, sig: RealProd['sig'], snd: L, fx: RealProd['fx'], fam: FamilyId[], tier: RealProd['tier'], skill: number, ego: number, a: RealProd['a'], bio: L, w: RealProd['w']): RealProd =>
  ({ id, name, born, died: died || undefined, city, studio, from, to, sig, snd, fx, fam, tier, skill, ego, a, bio, w });
/** Produtores de gravação (A&R) da era acústica: arrumam músicos em volta da corneta. */
export const PRODS_1889: RealProd[] = [
  P('gaisberg', 'Fred Gaisberg', 1873, 1951, 'london', 'Gramophone Co. (sala do Savoy Hotel, Milão, Calcutá)', 1898, 1939, 'organic', l('Corneta acústica itinerante', 'Travelling acoustic horn'), [3, 8, 2], ['sacred', 'europe', 'asia_me'], 3, 88, 25, [92, 85, 80, 80, 45],
    l('Pianista que virou o primeiro grande produtor: gravou Caruso num quarto de hotel em Milão (1902) e levou a corneta à Índia, à Rússia e ao Japão.', 'Pianist turned the first great producer: recorded Caruso in a Milan hotel room (1902) and took the horn to India, Russia and Japan.'),
    [['Questa o quella', 'Enrico Caruso', 1902]]),
  P('calvinchild', 'Calvin G. Child', 1869, 1925, 'philadelphia', 'Victor (Camden)', 1902, 1923, 'glossy', l('Selo vermelho de prestígio', 'Prestige Red Seal'), [5, 6, -1], ['sacred', 'pop'], 4, 86, 35, [88, 88, 70, 85, 55],
    l('Diretor de gravações da Victor: trouxe Caruso e as estrelas da ópera para o selo vermelho.', 'Victor\'s recording director: brought Caruso and the opera stars to Red Seal.'), [['Vesti la giubba', 'Enrico Caruso', 1907]]),
  P('wbrogers', 'Walter B. Rogers', 1865, 1939, 'philadelphia', 'Victor (Camden)', 1904, 1916, 'organic', l('Orquestra da casa', 'House orchestra'), [4, 6, 0], ['pop', 'sacred'], 2, 82, 20, [85, 60, 65, 80, 30],
    l('Ex-cornetista da banda de Sousa, regeu a orquestra da Victor e acompanhou centenas de gravações.', 'Former Sousa cornetist who led Victor\'s house orchestra on hundreds of records.'), []),
];

const M = (id: string, name: string, born: number | undefined, died: number | undefined, city: string, from: number, to: number, style: RealMgr['style'], fam: FamilyId[], a: RealMgr['a'], rate: number, bio: L, cl: RealMgr['cl']): RealMgr =>
  ({ id, name, born, died, city, from, to, style, fam, a, rate, bio, cl });
/** Empresários de palco (impresarios) da era: teatros de ópera, revistas e circuitos de vaudeville. */
export const MGRS_1889: RealMgr[] = [
  M('hammerstein1', 'Oscar Hammerstein I', 1846, 1919, 'new_york', 1889, 1919, 'impresario', ['sacred', 'pop'], [80, 75, 85, 55, 80], 0.2,
    l('Fabricante de charutos que construía teatros: desafiou o Metropolitan com a Manhattan Opera House (1906).', 'Cigar maker who built theatres: challenged the Met with the Manhattan Opera House (1906).'), []),
  M('ziegfeld', 'Florenz Ziegfeld', 1867, 1932, 'new_york', 1907, 1932, 'svengali', ['pop'], [85, 80, 90, 60, 95], 0.25,
    l('As Ziegfeld Follies (1907): revista de luxo que lançou Nora Bayes e Bert Williams num elenco antes só branco.', 'The Ziegfeld Follies (1907): luxury revue that showcased Nora Bayes and Bert Williams in a once all-white cast.'),
    [['Bert Williams', 1910, 1919], ['Nora Bayes', 1908, 1909]]),
  M('bfkeith', 'B. F. Keith', 1846, 1914, 'boston', 1889, 1914, 'impresario', ['pop'], [60, 85, 70, 85, 60], 0.15,
    l('Dono do maior circuito de vaudeville do Leste: shows "limpos" para famílias e cachês ditados pelo escritório central.', 'Owner of the East\'s biggest vaudeville circuit: "clean" family shows and fees set by the central booking office.'), []),
];

const RL = (id: string, pt: string, en: string, owner: string, year: number, month: number, kind: RelicDef17['kind'], value: number, sp: string, se: string, lp: string, le: string): RelicDef17 =>
  ({ id, name: l(pt, en), owner, year, month, kind, value, story: l(sp, se), location: l(lp, le) });
export const RELICS_1889: RelicDef17[] = [
  RL('edison_tinfoil', 'O fonógrafo de folha de estanho de Edison', 'Edison\'s tinfoil phonograph', '', 1877, 11, 'prop', 900,
    'Em dezembro de 1877, Edison gravou "Mary had a little lamb" num cilindro coberto de estanho: a primeira voz devolvida por uma máquina.', 'In December 1877 Edison recorded "Mary had a little lamb" on a tinfoil-wrapped cylinder: the first voice played back by a machine.',
    'Parque Histórico Nacional Thomas Edison, Nova Jersey', 'Thomas Edison National Historical Park, New Jersey'),
  RL('nipper_painting', 'A pintura "His Master\'s Voice" (Nipper)', 'The "His Master\'s Voice" painting (Nipper)', '', 1899, 1, 'art', 1500,
    'Francis Barraud pintou seu cão Nipper ouvindo um fonógrafo; a Gramophone Co. comprou o quadro em 1899 trocando o aparelho por um gramofone.', 'Francis Barraud painted his dog Nipper listening to a phonograph; the Gramophone Co. bought it in 1899 with the machine repainted as a gramophone.',
    'Arquivo da EMI, Hayes', 'EMI Archive, Hayes'),
  RL('caruso_1902', 'As matrizes de Caruso em Milão (1902)', 'Caruso\'s Milan masters (1902)', 'Enrico Caruso', 1902, 3, 'record', 400,
    'Dez árias gravadas por Fred Gaisberg num quarto do Grand Hotel de Milão, por 100 libras: os discos que deram prestígio ao gramofone.', 'Ten arias recorded by Fred Gaisberg in a Milan Grand Hotel room for £100: the records that gave the gramophone prestige.',
    'Arquivo da Gramophone Co.', 'Gramophone Co. archive'),
  RL('isto_e_bom', 'O primeiro disco brasileiro: "Isto É Bom" (1902)', 'The first Brazilian record: "Isto É Bom" (1902)', 'Bahiano', 1902, 0, 'record', 120,
    'Lundu de Xisto Bahia cantado por Bahiano para a Casa Edison: o número 10.001 do catálogo.', 'A lundu by Xisto Bahia sung by Bahiano for Casa Edison: catalog number 10,001.',
    'Instituto Moreira Salles, Rio', 'Instituto Moreira Salles, Rio'),
  RL('livery_stable', 'O disco "Livery Stable Blues" (1917)', 'The "Livery Stable Blues" disc (1917)', 'Original Dixieland Jass Band', 1917, 1, 'record', 150,
    'O primeiro disco de jazz lançado (Victor 18255): vendeu como água e espalhou a palavra "jass".', 'The first jazz record released (Victor 18255): it sold like wildfire and spread the word "jass".',
    'Coleção particular', 'Private collection'),
];

const O = (id: string, name: string, real: string, kind: Outlet17['kind'], market: Outlet17['market'], from: number, to: number, line: Outlet17['line'], reach: number, cred: number, stance: number, fav: FamilyId[], pt: string, en: string): Outlet17 =>
  ({ id, name, real, kind, market, from, to, line, reach, cred, stance, fav, desc: l(pt, en) });
/** Imprensa da era: jornais de espetáculo e revistas do comércio de máquinas falantes. */
export const OUTLETS_1889: Outlet17[] = [
  O('billboard1894', 'Cartaz Semanal', 'Billboard', 'trade', 'na', 1894, 1919, 'trade', 55, 60, 0.2, ['pop'], 'Nasceu para cartazistas e circos; em 1913 publica as partituras mais vendidas.', 'Born for billposters and circuses; in 1913 it starts listing the best-selling sheet music.'),
  O('variety1905', 'Palco & Variedade', 'Variety', 'trade', 'na', 1905, 1919, 'trade', 60, 65, 0.1, ['pop'], 'Bíblia do vaudeville: cachês, circuitos e quem lotou a casa.', 'The vaudeville bible: fees, circuits and who packed the house.'),
  O('tmw1905', 'Mundo da Máquina Falante', 'The Talking Machine World', 'trade', 'na', 1905, 1929, 'trade', 45, 70, 0.2, ['pop', 'sacred'], 'Revista dos lojistas de fonógrafos: lançamentos do mês e guerra de patentes.', 'The phonograph dealers\' paper: monthly releases and patent wars.'),
  O('theera', 'A Era', 'The Era', 'newspaper', 'eu', 1889, 1919, 'trade', 55, 60, 0.4, ['pop', 'europe'], 'Jornal do music hall britânico: crítica de teatro e anúncios de artistas.', 'The British music-hall paper: theatre reviews and artists\' ads.'),
  O('comoedia', 'Comédia', 'Comœdia', 'newspaper', 'eu', 1907, 1919, 'serious', 50, 60, 0, ['europe', 'sacred'], 'Diário parisiense só de espetáculos: ópera, cabaré e café-concerto.', 'Parisian daily devoted to shows: opera, cabaret and café-concert.'),
  O('omalho', 'O Malho Sonoro', 'O Malho', 'magazine', 'br', 1902, 1919, 'mainstream', 45, 45, 0.2, ['brazil'], 'Revista ilustrada carioca: caricaturas, carnaval e os discos da Casa Edison.', 'Illustrated Rio magazine: cartoons, carnival and Casa Edison\'s records.'),
];

/** Populações (milhões, territórios atuais) por volta de 1890, 1900 e 1910 — censos e estimativas. */
export const POP_1889: Record<string, [number, number, number]> = {
  USA: [63, 76, 92], CAN: [4.8, 5.4, 7.2], MEX: [12, 13.6, 15.2], BRA: [14.3, 17.4, 23.4], ARG: [3.4, 4.6, 6.8], CUB: [1.6, 1.6, 2.2],
  GBR: [33, 37, 40.8], IRL: [4.7, 4.5, 4.4], FRA: [38.3, 38.9, 39.6], DEU: [44, 50, 58.5], ITA: [30, 32.5, 35], ESP: [17.6, 18.6, 20],
  PRT: [5.1, 5.4, 6], RUS: [70, 72, 86], JPN: [40, 44, 49], IND: [220, 235, 250], CHN: [380, 400, 420], EGY: [7, 9.7, 11.2],
  ZAF: [3.5, 5, 6], NGA: [14, 15, 16], AUS: [3.2, 3.8, 4.5], NZL: [0.63, 0.8, 1], AUT: [5.4, 6, 6.6], SWE: [4.8, 5.1, 5.5],
};

/** Gosto por família antes de 1920 (salões, bandas, ópera e teatro). */
export const TASTE_1889: Record<string, Partial<Record<FamilyId, number>>> = {
  USA: { pop: 1.6, sacred: 1.3, europe: 1, blues_jazz: 0.7, country_folk: 0.8 }, CAN: { pop: 1.3, sacred: 1.3, europe: 1.2 },
  GBR: { pop: 1.6, sacred: 1.3, europe: 1.2 }, FRA: { europe: 1.9, sacred: 1.2, pop: 0.9 }, DEU: { europe: 1.7, sacred: 1.5 },
  ITA: { sacred: 1.8, europe: 1.6 }, ESP: { europe: 1.8, sacred: 1.1 }, BRA: { brazil: 1.7, europe: 1.2, sacred: 1 },
  ARG: { latin: 1.6, europe: 1.4, sacred: 1 }, MEX: { latin: 1.6, europe: 1.1 }, CUB: { latin: 1.8, caribbean: 1.1 },
};

/** Impérios e uniões até 1918–22 (para mapa, vistos e notícias). */
export const UNIONS_1889 = [
  { id: 'AHE', name: l('Áustria-Hungria', 'Austria-Hungary'), from: 1867, to: 1918, members: ['AUT', 'HUN', 'CZE', 'SVK', 'SVN', 'HRV', { a3: 'BIH', from: 1908 }] },
  { id: 'RUE', name: l('Império Russo', 'Russian Empire'), from: 1721, to: 1917, members: ['RUS', 'UKR', 'BLR', 'FIN', 'POL', 'EST', 'LVA', 'LTU', 'GEO', 'ARM', 'AZE', 'KAZ', 'UZB', 'KGZ', 'TJK', 'TKM', 'MDA'] },
  { id: 'OTE', name: l('Império Otomano', 'Ottoman Empire'), from: 1299, to: 1922, members: ['TUR', { a3: 'SYR', to: 1918 }, { a3: 'LBN', to: 1918 }, { a3: 'IRQ', to: 1918 }, { a3: 'JOR', to: 1918 }, { a3: 'ISR', to: 1918 }, { a3: 'PSE', to: 1918 }, { a3: 'ALB', to: 1912 }, { a3: 'MKD', to: 1912 }] },
  { id: 'SWN', name: l('Suécia-Noruega', 'Sweden-Norway'), from: 1814, to: 1905, members: ['SWE', 'NOR'] },
];
