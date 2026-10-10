// Rodada 18 (rights18, frente A: D1/D3/D4) — dados reais de gestão coletiva e precedentes jurídicos.
// Sociedades por mercado e época: taxa de administração, defasagem de repasse (meses após o fim do período),
// "caixa preta" típica (fatia não identificada) e quais direitos cobram (execução, mecânico, conexos).
// Valores aproximados e arredondados para jogo; datas de fundação reais.
import { l, type L } from './world';

export type Mod18 = 'perf' | 'mech' | 'print' | 'neigh' | 'sync' | 'adm';
export interface Soc18 {
  id: string; mk: string; name: string; from: number; to?: number;
  /** direitos que arrecada: p = execução pública, m = mecânico, n = conexos (intérpretes, músicos, produtor fonográfico) */
  does: string;
  fee: number; lag: number; bb: number;
  /** exige convite/catálogo (SESAC) */
  invite?: boolean;
  note: L;
}

export const SOCS18: Soc18[] = [
  // América do Norte
  { id: 'ascap', mk: 'na', name: 'ASCAP', from: 1914, does: 'p', fee: 0.12, lag: 0, bb: 0.06, note: l('A mais antiga dos EUA (1914): paga bem por execução, gosto tradicional (Broadway, Tin Pan Alley).', 'The oldest US society (1914): pays well per play, traditional taste (Broadway, Tin Pan Alley).') },
  { id: 'bmi', mk: 'na', name: 'BMI', from: 1940, does: 'p', fee: 0.1, lag: 0, bb: 0.07, note: l('Criada pelas rádios em 1939–40 contra o boicote da ASCAP: abriu as portas para country, R&B, rock e latinos.', 'Founded by broadcasters in 1939–40 against the ASCAP boycott: opened the door to country, R&B, rock and Latin.') },
  { id: 'sesac', mk: 'na', name: 'SESAC', from: 1930, does: 'p', fee: 0.09, lag: -1, bb: 0.04, invite: true, note: l('Privada e só por convite: poucos membros, repasse rápido e bem identificado.', 'Private and invitation-only: few members, fast and well-identified payouts.') },
  { id: 'hfa', mk: 'na', name: 'Harry Fox Agency', from: 1927, does: 'm', fee: 0.085, lag: 0, bb: 0.08, note: l('Licença mecânica compulsória desde 1909 (2¢ por cópia até 1977); a HFA cobra das gravadoras.', 'Compulsory mechanical license since 1909 (2¢ per copy until 1977); HFA collects from labels.') },
  { id: 'mlc', mk: 'na', name: 'MLC', from: 2021, does: 'm', fee: 0, lag: 0, bb: 0.04, note: l('Criada pela Music Modernization Act (2018): licença geral de streaming e base pública de obras.', 'Created by the Music Modernization Act (2018): blanket streaming license and a public works database.') },
  { id: 'sx', mk: 'na', name: 'SoundExchange', from: 2000, does: 'n', fee: 0.05, lag: 1, bb: 0.1, note: l('Conexos só no digital (satélite, webrádio). Nos EUA, rádio AM/FM não paga a gravação — só a composição.', 'Neighbouring rights for digital only (satellite, webcasting). US AM/FM radio pays the song, never the recording.') },
  // Europa (âncoras por país; o mercado europeu é um só no jogo)
  { id: 'prs', mk: 'eu', name: 'PRS + MCPS + PPL (UK)', from: 1914, does: 'pmn', fee: 0.13, lag: 1, bb: 0.07, note: l('PRS (1914) execução, MCPS (1924) mecânico, PPL (1934) conexos — o caso Cawardine (1933) criou o direito da gravação tocada em público.', 'PRS (1914) performance, MCPS (1924) mechanical, PPL (1934) neighbouring — the Cawardine case (1933) created the public-performance right in recordings.') },
  { id: 'gema', mk: 'eu', name: 'GEMA + GVL (DE)', from: 1933, does: 'pmn', fee: 0.15, lag: 2, bb: 0.05, note: l('Tarifas altas e cadastro rigoroso ("presunção GEMA"): pouco dinheiro some, mas demora.', 'High tariffs and strict registration (the "GEMA presumption"): little money gets lost, but it is slow.') },
  { id: 'sacem', mk: 'eu', name: 'SACEM + SDRM (FR)', from: 1851, does: 'pmn', fee: 0.14, lag: 0, bb: 0.06, note: l('A primeira do mundo (1851, café-concerto Les Ambassadeurs). Paga rápido e defende a música francesa.', 'The world\'s first (1851, the Les Ambassadeurs café-concert). Pays fast and defends French music.') },
  // Brasil
  { id: 'ubc', mk: 'br', name: 'UBC / SBACEM', from: 1942, to: 1972, does: 'p', fee: 0.25, lag: 3, bb: 0.3, note: l('Antes do ECAD, várias sociedades brigavam pela mesma rádio: muito dinheiro sem dono.', 'Before ECAD, several societies fought over the same radio station: lots of ownerless money.') },
  { id: 'ecad', mk: 'br', name: 'ECAD', from: 1973, does: 'pn', fee: 0.25, lag: 2, bb: 0.2, note: l('Escritório central único (Lei 5.988/1973) para direito autoral E conexo: autores/editores de um lado, intérpretes, músicos e gravadoras do outro.', 'Single central office (Law 5,988/1973) for authors AND neighbouring rights: authors/publishers on one side, performers, musicians and labels on the other.') },
  // América Latina
  { id: 'sadaic', mk: 'latam', name: 'SADAIC / SACM / SAYCO', from: 1936, does: 'pm', fee: 0.2, lag: 3, bb: 0.2, note: l('Argentina (1936), México (1945), Colômbia (1946): fortes no rádio local, fracas na fronteira.', 'Argentina (1936), Mexico (1945), Colombia (1946): strong on local radio, weak across borders.') },
  // Ásia
  { id: 'jasrac', mk: 'asia', name: 'JASRAC', from: 1939, does: 'pm', fee: 0.12, lag: 5, bb: 0.12, note: l('Japão (1939): quase monopólio, cobra tudo — e é famosa pela defasagem longa no repasse ao exterior.', 'Japan (1939): near-monopoly that collects everything — and is famous for slow payouts abroad.') },
  { id: 'komca', mk: 'asia', name: 'KOMCA / IPRS / MCSC', from: 1964, does: 'pm', fee: 0.18, lag: 4, bb: 0.25, note: l('Coreia (1964), Índia (1969), China (1992): mercados enormes com muita execução não identificada.', 'Korea (1964), India (1969), China (1992): huge markets with lots of unidentified use.') },
  // África
  { id: 'samro', mk: 'africa', name: 'SAMRO / MCSK / COSON', from: 1961, does: 'pm', fee: 0.25, lag: 6, bb: 0.4, note: l('África do Sul (1961), Quênia (1983), Nigéria (2010): cobrança difícil, caixa preta enorme.', 'South Africa (1961), Kenya (1983), Nigeria (2010): hard collection, a huge black box.') },
  // Oceania
  { id: 'apra', mk: 'oceania', name: 'APRA AMCOS + PPCA', from: 1926, does: 'pmn', fee: 0.13, lag: 1, bb: 0.06, note: l('Austrália (1926): eficiente, e a PPCA (1969) cobra a gravação tocada no rádio.', 'Australia (1926): efficient, and PPCA (1969) collects for recordings played on radio.') },
];

/** Direito conexo (gravação tocada em público) por mercado: desde quando e quanto (fração da receita do master). */
export const NEIGH18: Record<string, { from: number; rate: number; digitalOnly?: boolean }> = {
  eu: { from: 1934, rate: 0.05 }, br: { from: 1973, rate: 0.06 }, asia: { from: 1971, rate: 0.025 }, oceania: { from: 1969, rate: 0.04 },
  latam: { from: 1995, rate: 0.025 }, africa: { from: 2005, rate: 0.015 }, na: { from: 2000, rate: 0.05, digitalOnly: true },
};

/** Precedentes jurídicos: datas reais; efeitos multiplicam (×) chances ou somam (+) às chances de defesa. */
export interface Prec18Def {
  id: string; y: number; m: number; name: string; who: [L, L];
  /** p = lado que ganhou de verdade (para financiar), d = defesa */
  won: 'p' | 'd';
  mk?: string;
  text: L; effect: L;
  fx: Record<string, number>;
}
export const PRECS18: Prec18Def[] = [
  { id: 'harrison', y: 1976, m: 7, name: 'Bright Tunes × Harrisongs', who: [l('os autores de "He\'s So Fine"', 'the writers of "He\'s So Fine"'), l('George Harrison', 'George Harrison')], won: 'p',
    text: l('"My Sweet Lord" é condenada por plágio inconsciente.', '"My Sweet Lord" is found to be subconscious plagiarism.'), effect: l('Processos de plágio +30% e mais difíceis de vencer.', 'Plagiarism suits +30% and harder to win.'), fx: { plagSuit: 1.3, plagOdds: -0.05 } },
  { id: 'act1976', y: 1978, m: 0, name: 'Copyright Act 1976 (EUA)', who: [l('autores e artistas', 'authors and artists'), l('gravadoras e editoras', 'labels and publishers')], won: 'p', mk: 'na',
    text: l('Entra em vigor a lei americana de 1976: cessões feitas a partir de 1978 podem ser rescindidas pelo autor após 35 anos.', 'The 1976 US Copyright Act takes effect: grants made from 1978 can be terminated by the author after 35 years.'), effect: l('Masters e obras americanos de 1978 em diante ganham prazo de rescisão (35 anos).', 'US masters and works from 1978 on get a termination window (35 years).'), fx: { term: 1 } },
  { id: 'grandupright', y: 1991, m: 11, name: 'Grand Upright × Warner (Biz Markie)', who: [l('Gilbert O\'Sullivan', 'Gilbert O\'Sullivan'), l('Biz Markie e a Warner', 'Biz Markie and Warner')], won: 'p',
    text: l('"Não roubarás": juiz manda recolher o disco de Biz Markie por sample não liberado.', '"Thou shalt not steal": judge orders Biz Markie\'s album pulled for an uncleared sample.'), effect: l('Sample sem liberação: processo 2× mais provável e quase impossível de vencer.', 'Uncleared samples: suits 2× likelier and nearly unwinnable.'), fx: { sampleSuit: 2, sampleOdds: -0.15 } },
  { id: 'fogerty', y: 1994, m: 2, name: 'Fogerty × Fantasy', who: [l('Fantasy Records', 'Fantasy Records'), l('John Fogerty', 'John Fogerty')], won: 'd',
    text: l('Suprema Corte: quem vence processo de direito autoral pode cobrar honorários do autor da ação.', 'Supreme Court: winning copyright defendants can recover attorney fees.'), effect: l('Processos de plágio oportunistas caem 15%.', 'Opportunistic plagiarism suits drop 15%.'), fx: { plagSuit: 0.85 } },
  { id: 'lda98', y: 1998, m: 1, name: 'Lei 9.610 (Brasil)', who: [l('autores', 'authors'), l('usuários de música', 'music users')], won: 'p', mk: 'br',
    text: l('Nova Lei de Direitos Autorais no Brasil consolida autor, editor e conexos.', 'Brazil\'s new Copyright Law consolidates author, publisher and neighbouring rights.'), effect: l('Caixa preta no Brasil −15%.', 'Brazil black box −15%.'), fx: { bb_br: 0.85 } },
  { id: 'bridgeport', y: 2005, m: 5, name: 'Bridgeport × Dimension Films', who: [l('a Bridgeport (catálogo do Funkadelic)', 'Bridgeport (the Funkadelic catalog)'), l('a Dimension Films', 'Dimension Films')], won: 'p',
    text: l('"Tire uma licença ou não use sample": nem 2 segundos de guitarra escapam.', '"Get a license or do not sample": not even 2 seconds of guitar get a pass.'), effect: l('Processos por sample +40%.', 'Sample suits +40%.'), fx: { sampleSuit: 1.4, sampleOdds: -0.05 } },
  { id: 'eu2011', y: 2013, m: 10, name: 'Diretiva 2011/77/UE', who: [l('artistas e gravadoras', 'artists and labels'), l('selos de reedição', 'reissue labels')], won: 'p', mk: 'eu',
    text: l('Na Europa, a proteção das gravações sobe de 50 para 70 anos (com cláusula "use ou perca" para o artista).', 'In Europe, protection of recordings rises from 50 to 70 years (with a "use it or lose it" clause for performers).'), effect: l('Gravações com mais de 50 anos voltam a pagar conexos na Europa.', 'Recordings over 50 years old pay neighbouring rights in Europe again.'), fx: { euTerm: 70 } },
  { id: 'willis', y: 2013, m: 2, name: 'Scorpio Music × Willis (Village People)', who: [l('Victor Willis', 'Victor Willis'), l('a editora Scorpio', 'Scorpio Music')], won: 'p', mk: 'na',
    text: l('Victor Willis recupera sua parte de "Y.M.C.A." — a primeira rescisão de 35 anos vencida na Justiça.', 'Victor Willis recovers his share of "Y.M.C.A." — the first 35-year termination won in court.'), effect: l('Artistas americanos pedem rescisão 50% mais e a tese de "obra por encomenda" quase não vence.', 'US artists file terminations 50% more and the "work for hire" defense rarely wins.'), fx: { term: 1.5, termOdds: -0.15 } },
  { id: 'ecad13', y: 2013, m: 7, name: 'CPI do ECAD → Lei 12.853', who: [l('compositores', 'songwriters'), l('o ECAD e as associações', 'ECAD and its associations')], won: 'p', mk: 'br',
    text: l('Depois da CPI do ECAD (2012), a Lei 12.853 impõe transparência e teto à taxa de administração.', 'After the ECAD congressional inquiry (2012), Law 12,853 imposes transparency and a cap on the admin fee.'), effect: l('ECAD: taxa cai para ~15% e caixa preta −40%.', 'ECAD: fee drops to ~15% and black box −40%.'), fx: { fee_br: 0.6, bb_br: 0.6 } },
  { id: 'blurred', y: 2015, m: 2, name: 'Williams × Gaye ("Blurred Lines")', who: [l('a família de Marvin Gaye', 'Marvin Gaye\'s family'), l('Pharrell Williams e Robin Thicke', 'Pharrell Williams and Robin Thicke')], won: 'p',
    text: l('Júri dá US$ 7,4 milhões aos herdeiros de Marvin Gaye: o "clima" de uma música passa a ser disputável.', 'Jury awards $7.4 million to Marvin Gaye\'s heirs: a song\'s "feel" becomes litigable.'), effect: l('Processos de plágio 2,5× mais frequentes e mais difíceis de vencer.', 'Plagiarism suits 2.5× more frequent and harder to win.'), fx: { plagSuit: 2.5, plagOdds: -0.15 } },
  { id: 'madonna', y: 2016, m: 5, name: 'VMG Salsoul × Ciccone (Madonna)', who: [l('a VMG Salsoul', 'VMG Salsoul'), l('Madonna', 'Madonna')], won: 'd',
    text: l('Tribunal da Califórnia aceita o uso mínimo ("de minimis") de 0,23 s de metais em "Vogue".', 'California court accepts the de minimis use of 0.23 s of horns in "Vogue".'), effect: l('Processos por sample −15%.', 'Sample suits −15%.'), fx: { sampleSuit: 0.85 } },
  { id: 'mma', y: 2018, m: 9, name: 'Music Modernization Act', who: [l('compositores e artistas', 'songwriters and artists'), l('plataformas digitais', 'digital platforms')], won: 'p', mk: 'na',
    text: l('Lei unânime nos EUA cria o MLC (licença mecânica geral) e paga as gravações anteriores a 1972 no digital.', 'Unanimous US law creates the MLC (blanket mechanical license) and pays pre-1972 recordings on digital.'), effect: l('Caixa preta mecânica nos EUA −50%; masters pré-1972 recebem conexos digitais.', 'US mechanical black box −50%; pre-1972 masters earn digital neighbouring rights.'), fx: { bb_na: 0.5, pre72: 1 } },
  { id: 'zeppelin', y: 2020, m: 2, name: 'Skidmore × Led Zeppelin', who: [l('o espólio de Randy California', 'Randy California\'s estate'), l('Led Zeppelin', 'Led Zeppelin')], won: 'd',
    text: l('Tribunal pleno absolve "Stairway to Heaven" e derruba a regra do "acesso inverso".', 'The full court clears "Stairway to Heaven" and scraps the "inverse ratio" rule.'), effect: l('Processos de plágio −40% e mais fáceis de vencer.', 'Plagiarism suits −40% and easier to win.'), fx: { plagSuit: 0.6, plagOdds: 0.1 } },
  { id: 'sheeran', y: 2023, m: 4, name: 'Townsend × Sheeran ("Thinking Out Loud")', who: [l('herdeiros de Ed Townsend', 'Ed Townsend\'s heirs'), l('Ed Sheeran', 'Ed Sheeran')], won: 'd',
    text: l('Júri decide que acordes e ritmos comuns são "o alfabeto da música" e não pertencem a ninguém.', 'Jury rules that common chords and rhythms are "the alphabet of music" and belong to no one.'), effect: l('Processos de plágio −20%.', 'Plagiarism suits −20%.'), fx: { plagSuit: 0.8, plagOdds: 0.05 } },
];
