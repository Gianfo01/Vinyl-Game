// Rodada 17 — dados de imprensa: veículos que faltavam (tabloides, TV, rádio, blogs, redes sociais por era),
// colunistas de fofoca reais, críticos reais documentados por era e alguns fictícios para tapar buracos de
// mercado/época. Nomes de veículos seguem o padrão do jogo (ficcional + "≈ real"); críticos e colunistas reais
// aparecem com o nome verdadeiro e só nos anos em que escreveram.

import { l, type FamilyId, type L, type MarketId } from './world';

export type OKind = 'tabloid' | 'magazine' | 'newspaper' | 'trade' | 'radio' | 'tv' | 'blog' | 'social' | 'fanzine';
export type OLine = 'tabloid' | 'serious' | 'trade' | 'mainstream' | 'underground' | 'fan';
export interface Outlet17 {
  id: string; name: string; real?: string; kind: OKind; market: MarketId | 'global'; from: number; to: number;
  line: OLine; reach: number; cred: number; /** −1 progressista … +1 conservador */ stance: number; fav: FamilyId[]; owner?: string; desc: L;
}
const o = (id: string, name: string, real: string | undefined, kind: OKind, market: Outlet17['market'], from: number, to: number, line: OLine, reach: number, cred: number, stance: number, fav: FamilyId[], owner: string | undefined, pt: string, en: string): Outlet17 =>
  ({ id, name, real, kind, market, from, to, line, reach, cred, stance, fav, owner, desc: l(pt, en) });

export const OUTLETS17: Outlet17[] = [
  // tabloides e revistas de celebridade
  o('confid', 'Sigilo Total', 'Confidential', 'tabloid', 'na', 1952, 1958, 'tabloid', 70, 20, 0.3, ['pop'], 'Robert Harrison', 'Revelou segredos de Hollywood até ser processado pelos próprios astros (1957).', 'Exposed Hollywood secrets until the stars sued it (1957).'),
  o('enquirer', 'Sondagem Nacional', 'National Enquirer', 'tabloid', 'na', 1957, 2040, 'tabloid', 80, 15, 0.3, ['pop', 'country_folk'], 'American Media', 'Paga por fotos e informantes; famoso pelo "catch and kill".', 'Pays for photos and tipsters; famous for "catch and kill".'),
  o('newsworld', 'Mundo das Notícias', 'News of the World', 'tabloid', 'eu', 1950, 2011, 'tabloid', 85, 20, 0.4, ['pop'], 'News Corp', 'O maior domingo britânico; fechou em 2011 no escândalo dos grampos.', 'Britain\'s biggest Sunday; closed in 2011 over phone hacking.'),
  o('sunuk', 'O Sol da Fleet Street', 'The Sun', 'tabloid', 'eu', 1969, 2040, 'tabloid', 85, 25, 0.4, ['pop', 'rock'], 'News Corp', 'Coluna "Bizarre" de fofoca pop; manchetes que derrubam carreiras.', '"Bizarre" pop gossip column; headlines that sink careers.'),
  o('np_br', 'Notícias Já', 'Notícias Populares', 'tabloid', 'br', 1963, 2001, 'tabloid', 55, 15, 0.2, ['brazil', 'pop'], 'Grupo Folha', '"Espremendo, sai sangue": crime, fofoca e o "bebê-diabo".', '"Squeeze it and blood comes out": crime, gossip and the "devil baby".'),
  o('contigo', 'Contigo Já', 'Contigo! / Amiga', 'magazine', 'br', 1963, 2040, 'tabloid', 65, 30, 0.3, ['brazil', 'pop'], 'Abril', 'Casamentos, separações e novelas na capa da banca.', 'Weddings, breakups and soap stars on the newsstand cover.'),
  o('hola', 'Olá!', '¡Hola!', 'magazine', 'eu', 1944, 2040, 'tabloid', 70, 40, 0.3, ['pop', 'europe', 'latin'], 'Família Sánchez Junco', 'Paga caro por fotos exclusivas de casamentos e bebês: fofoca com bons modos.', 'Pays big for exclusive wedding and baby photos: gossip with manners.'),
  o('tvnovelas', 'TV y Chismes', 'TVyNovelas', 'magazine', 'latam', 1979, 2040, 'tabloid', 70, 30, 0.4, ['latin', 'pop'], 'Televisa', 'Bastidores de novela e romances de cantores.', 'Soap backstage and singers\' romances.'),
  o('tmz', 'TMX', 'TMZ', 'blog', 'na', 2005, 2040, 'tabloid', 90, 45, 0, ['pop', 'hiphop'], 'Warner Bros. / Fox', 'Câmera na porta da boate; costuma acertar primeiro.', 'Camera outside the club; usually right first.'),
  o('perez', 'Pérez Fofoca', 'PerezHilton.com', 'blog', 'global', 2004, 2040, 'tabloid', 70, 20, -0.2, ['pop'], undefined, 'Rabiscos em fotos de paparazzi e muita maldade.', 'Doodles on paparazzi shots and plenty of spite.'),
  o('bunshun', 'Semanário Bunshun', 'Shūkan Bunshun', 'tabloid', 'asia', 1959, 2040, 'tabloid', 70, 55, 0.3, ['asia_me', 'pop'], 'Bungeishunjū', 'O "Bunshun-hō": furo que encerra carreira de ídolo com uma foto.', 'The "Bunshun bomb": a scoop that ends an idol\'s career with one photo.'),
  o('dispatch', 'Despacho', 'Dispatch (Coreia)', 'blog', 'asia', 2011, 2040, 'tabloid', 70, 60, 0.2, ['asia_me', 'pop'], undefined, 'Revela namoros de ídolos todo 1º de janeiro.', 'Reveals idol romances every January 1st.'),
  // jornais, rádio e TV de massa
  o('nyt', 'Diário da Metrópole', 'The New York Times', 'newspaper', 'na', 1920, 2040, 'serious', 75, 90, -0.2, ['blues_jazz', 'rock', 'pop'], 'Família Sulzberger', 'Jornal de referência; publicar aqui é virar "fato".', 'Paper of record; printed here, it becomes "fact".'),
  o('bbc', 'Rede Pública Britânica', 'BBC', 'radio', 'eu', 1922, 2040, 'serious', 85, 85, 0.2, ['pop', 'rock', 'europe'], 'Estado britânico', 'Rádio e TV públicos; uma proibição na BBC vira manchete no mundo.', 'Public radio and TV; a BBC ban becomes world news.'),
  o('freed', 'Rádio do Moondog', 'WINS (Alan Freed)', 'radio', 'na', 1951, 1960, 'mainstream', 60, 40, -0.4, ['rnb', 'rock'], undefined, 'O DJ que batizou o rock and roll — até o escândalo do jabá (1959).', 'The DJ who named rock and roll — until the payola scandal (1959).'),
  o('caroline', 'Rádio Pirata Caroline', 'Radio Caroline', 'radio', 'eu', 1964, 1990, 'underground', 50, 55, -0.6, ['rock', 'pop'], undefined, 'Transmite de um navio para driblar o monopólio estatal.', 'Broadcasts from a ship to dodge the state monopoly.'),
  o('globo_tv', 'Rede Planeta', 'TV Globo', 'tv', 'br', 1965, 2040, 'mainstream', 95, 60, 0.3, ['brazil', 'pop'], 'Organizações Planeta (≈ Globo)', 'Novela, Fantástico e trilha sonora: o país inteiro ao mesmo tempo.', 'Soaps, Sunday shows and soundtracks: the whole country at once.'),
  o('televisa', 'Telecanal', 'Televisa', 'tv', 'latam', 1973, 2040, 'mainstream', 90, 50, 0.4, ['latin', 'pop'], 'Telecanal', 'Programa de domingo que fabrica ídolos do México à Argentina.', 'Sunday show that makes idols from Mexico to Argentina.'),
  o('mtv', 'Canal VTV', 'MTV', 'tv', 'global', 1981, 2040, 'mainstream', 90, 50, -0.3, ['pop', 'rock', 'hiphop'], 'Viacom', 'Videoclipe 24 horas; depois, reality show.', 'Music videos 24/7; later, reality TV.'),
  o('nhk', 'Rede Pública Nipônica', 'NHK', 'tv', 'asia', 1926, 2040, 'serious', 85, 85, 0.4, ['asia_me', 'pop'], 'Estado japonês', 'O Kōhaku de Ano-Novo decide quem é estrela no Japão.', 'The New Year Kōhaku decides who is a star in Japan.'),
  // fanzines, fóruns e redes
  o('zine', 'Fanzine Xerox', 'Sniffin\' Glue', 'fanzine', 'eu', 1976, 1998, 'underground', 15, 60, -0.8, ['rock'], undefined, 'Grampeado à mão; quem lê é quem importa na cena.', 'Hand-stapled; the people who read it are the scene.'),
  o('forum', 'Fórum dos Fãs', 'Usenet / fóruns', 'social', 'global', 1993, 2012, 'fan', 30, 25, -0.3, ['rock', 'electronic', 'pop'], undefined, 'Teorias, vazamentos e brigas de fã em tópicos infinitos.', 'Theories, leaks and fan fights in endless threads.'),
  o('myspace', 'MeuEspaço', 'MySpace', 'social', 'global', 2003, 2011, 'fan', 60, 20, -0.3, ['rock', 'hiphop', 'pop'], 'News Corp', 'Top 8 de amigos e faixas tocando no perfil.', 'Top 8 friends and songs autoplaying on the profile.'),
  o('youtube', 'TuboVídeo', 'YouTube', 'social', 'global', 2005, 2040, 'fan', 90, 25, -0.2, ['pop', 'hiphop', 'electronic'], 'Google', 'Clipes, reações e vídeos de "a verdade sobre…".', 'Videos, reactions and "the truth about…" uploads.'),
  o('twitter', 'Piu', 'Twitter / X', 'social', 'global', 2006, 2040, 'fan', 90, 15, 0, ['pop', 'hiphop'], undefined, 'Boato vira assunto mundial em uma hora.', 'A rumor trends worldwide within an hour.'),
  o('insta', 'Retrato', 'Instagram', 'social', 'global', 2010, 2040, 'fan', 90, 15, -0.1, ['pop'], 'Meta', 'Unfollow vira notícia; foto apagada vira prova.', 'An unfollow is news; a deleted photo is evidence.'),
  o('tiktok', 'TiqueTaque', 'TikTok', 'social', 'global', 2016, 2040, 'fan', 95, 10, -0.2, ['pop', 'hiphop', 'latin'], 'ByteDance', 'Trend de 15 segundos decide a música do ano — e o cancelamento da semana.', 'A 15-second trend decides the song of the year — and the cancellation of the week.'),
  o('deuxmoi', 'Anônimas da Fofoca', 'DeuxMoi', 'social', 'global', 2020, 2040, 'tabloid', 60, 20, -0.3, ['pop'], undefined, 'Dicas anônimas sem checagem: "não estou dizendo, só repassando".', 'Unverified anonymous tips: "not confirming, just passing it on".'),
];

/** Colunistas de fofoca (reais), assinam boatos nos veículos do mercado deles. */
export interface Columnist { name: string; market: MarketId | 'global'; from: number; to: number; via: L }
const c = (name: string, market: Columnist['market'], from: number, to: number, pt: string, en: string): Columnist => ({ name, market, from, to, via: l(pt, en) });
export const COLUMNISTS: Columnist[] = [
  c('Louella Parsons', 'na', 1920, 1965, 'coluna nos jornais de Hearst', 'Hearst papers column'),
  c('Walter Winchell', 'na', 1924, 1963, 'coluna e rádio de domingo', 'column and Sunday radio'),
  c('Hedda Hopper', 'na', 1938, 1966, 'coluna "Hedda Hopper\'s Hollywood"', '"Hedda Hopper\'s Hollywood" column'),
  c('Rona Barrett', 'na', 1966, 1990, 'fofoca na TV', 'TV gossip'),
  c('Liz Smith', 'na', 1976, 2016, 'coluna diária em Nova York', 'daily New York column'),
  c('Ibrahim Sued', 'br', 1954, 1995, 'coluna social em O Globo', 'society column in O Globo'),
  c('Nelson Rubens', 'br', 1982, 2040, 'TV ("eu aumento, mas não invento")', 'TV ("I exaggerate, but I don\'t invent")'),
  c('Sonia Abrão', 'br', 1990, 2040, 'programa vespertino de TV', 'afternoon TV show'),
  c('Piers Morgan', 'eu', 1989, 1994, 'coluna "Bizarre" do The Sun', 'The Sun\'s "Bizarre" column'),
  c('Perez Hilton', 'global', 2004, 2040, 'blog', 'blog'),
];

/** Críticos reais documentados (anos de atividade aproximados) e fictícios novos para mercados sem cobertura. */
export interface Critic17 { name: string; outlet: string; from: number; to: number; favors: string[]; dislikes: string[]; mainstream: number; harsh: number; prestige: number; region: MarketId | 'global'; real?: 1; note: L }
const k = (name: string, outlet: string, from: number, to: number, favors: string[], dislikes: string[], mainstream: number, harsh: number, prestige: number, region: Critic17['region'], real: boolean, pt: string, en: string): Critic17 =>
  ({ name, outlet, from, to, favors, dislikes, mainstream, harsh, prestige, region, ...(real ? { real: 1 as const } : {}), note: l(pt, en) });
export const CRITICS17: Critic17[] = [
  k('Leonard Feather', 'DownBeat', 1935, 1994, ['blues_jazz'], ['rock'], -0.3, 0.5, 80, 'na', true, 'Fez o "teste às cegas" com músicos de jazz.', 'Ran the "Blindfold Test" with jazz players.'),
  k('Ralph J. Gleason', 'San Francisco Chronicle', 1950, 1975, ['blues_jazz', 'rock'], [], 0, 0.4, 82, 'na', true, 'Levou o jazz e depois o rock de São Francisco a sério; cofundou a Rolling Stone.', 'Took jazz and then San Francisco rock seriously; co-founded Rolling Stone.'),
  k('Nat Hentoff', 'The Village Voice', 1958, 2009, ['blues_jazz', 'country_folk'], ['pop'], -0.4, 0.5, 80, 'na', true, 'Jazz, liberdade de expressão e Dylan no começo.', 'Jazz, free speech and early Dylan.'),
  k('Jon Landau', 'Rolling Stone', 1966, 1975, ['rock', 'rnb'], [], 0.1, 0.55, 78, 'na', true, 'Viu "o futuro do rock" — e foi empresariá-lo.', 'Saw "rock\'s future" — and went on to manage it.'),
  k('Greil Marcus', 'Rolling Stone', 1968, 2025, ['rock', 'country_folk'], ['electronic'], -0.1, 0.5, 85, 'na', true, 'Lê canções como história da América.', 'Reads songs as American history.'),
  k('Ellen Willis', 'The New Yorker', 1968, 1975, ['rock'], [], 0, 0.45, 84, 'na', true, 'Primeira crítica de rock da New Yorker.', 'The New Yorker\'s first rock critic.'),
  k('Robert Christgau', 'The Village Voice', 1969, 2030, ['rock', 'hiphop', 'africa'], ['sacred'], -0.2, 0.6, 88, 'na', true, '"Decano" da crítica: notas de A+ a E e a enquete Pazz & Jop.', 'The "Dean": A+ to E grades and the Pazz & Jop poll.'),
  k('Lester Bangs', 'Creem', 1969, 1982, ['rock'], ['pop', 'country_folk'], -0.7, 0.85, 78, 'na', true, 'Resenhas-gonzo, brigas com Lou Reed e amor pelo barulho.', 'Gonzo reviews, fights with Lou Reed and a love of noise.'),
  k('Dave Marsh', 'Creem', 1969, 2010, ['rock', 'rnb'], ['electronic'], 0, 0.6, 74, 'na', true, 'Cunhou "punk rock" na imprensa; biógrafo de Springsteen.', 'Put "punk rock" in print; Springsteen biographer.'),
  k('Nick Kent', 'NME', 1972, 1990, ['rock'], ['pop'], -0.5, 0.7, 76, 'eu', true, 'Vivia com as bandas que resenhava.', 'Lived with the bands he reviewed.'),
  k('Charles Shaar Murray', 'NME', 1972, 1995, ['rock', 'blues_jazz'], [], -0.3, 0.6, 74, 'eu', true, 'Blues, Hendrix e frases afiadas.', 'Blues, Hendrix and sharp lines.'),
  k('Julie Burchill', 'NME', 1976, 1985, ['rock'], ['pop', 'country_folk'], -0.4, 0.85, 66, 'eu', true, 'Contratada aos 17 como "pistoleira" do punk.', 'Hired at 17 as punk\'s "hip young gunslinger".'),
  k('Paul Morley', 'NME', 1977, 1990, ['electronic', 'pop', 'rock'], ['country_folk'], 0, 0.6, 72, 'eu', true, 'Teoria pós-punk e, depois, o hype do ZTT.', 'Post-punk theory and, later, the ZTT hype.'),
  k('Kurt Loder', 'MTV News', 1979, 2005, ['rock', 'pop'], [], 0.4, 0.4, 70, 'na', true, 'Deu na MTV a notícia da morte de Kurt Cobain.', 'Broke Kurt Cobain\'s death on MTV.'),
  k('Nelson George', 'Billboard', 1980, 2010, ['rnb', 'hiphop'], ['rock'], 0.3, 0.45, 76, 'na', true, 'Cronista do R&B e do nascimento do hip-hop.', 'Chronicler of R&B and hip-hop\'s birth.'),
  k('Jon Pareles', 'The New York Times', 1982, 2040, ['rock', 'pop', 'latin'], [], 0.2, 0.45, 84, 'na', true, 'Crítico-chefe de pop do jornal de referência.', 'Chief pop critic of the paper of record.'),
  k('Simon Reynolds', 'Melody Maker', 1986, 2040, ['electronic', 'rock'], ['country_folk'], -0.6, 0.55, 82, 'eu', true, 'Cunhou "post-rock"; historiador do rave.', 'Coined "post-rock"; historian of rave.'),
  k('Ann Powers', 'NPR Music', 1993, 2040, ['pop', 'rock', 'rnb', 'country_folk'], [], 0.2, 0.35, 82, 'na', true, 'Defensora do "poptimismo" e das mulheres no rock.', 'Champion of "poptimism" and women in rock.'),
  k('Kelefa Sanneh', 'The New Yorker', 2000, 2040, ['hiphop', 'pop', 'country_folk'], [], 0.3, 0.4, 80, 'na', true, 'Escreveu "The Rap Against Rockism".', 'Wrote "The Rap Against Rockism".'),
  k('Anthony Fantano', 'theneedledrop', 2009, 2040, ['hiphop', 'electronic', 'rock'], ['pop'], -0.3, 0.6, 70, 'global', true, '"O nerd da música mais ocupado da internet"; notas de 0 a 10 em vídeo.', '"The internet\'s busiest music nerd"; 0–10 scores on video.'),
  k('José Ramos Tinhorão', 'Jornal do Brasil', 1958, 2000, ['brazil'], ['rock', 'pop'], -0.2, 0.85, 75, 'br', true, 'Implacável com a bossa nova "americanizada"; defensor do samba de raiz.', 'Ruthless with "Americanized" bossa nova; champion of roots samba.'),
  k('Nelson Motta', 'O Globo', 1966, 2015, ['brazil', 'pop', 'rock'], [], 0.5, 0.25, 68, 'br', true, 'Coluna, festivais e discotecas: entusiasta de tudo que é novo.', 'Columns, festivals and discos: a fan of anything new.'),
  k('Tárik de Souza', 'Jornal do Brasil', 1968, 2015, ['brazil', 'blues_jazz', 'rock'], [], 0, 0.45, 76, 'br', true, 'Enciclopédia da MPB.', 'An MPB encyclopedia.'),
  k('Ezequiel Neves', 'Somtrês', 1970, 1985, ['rock'], ['pop'], -0.3, 0.6, 62, 'br', true, 'Crítico que virou produtor do Barão Vermelho.', 'Critic turned Barão Vermelho producer.'),
  k('Ana Maria Bahiana', 'O Globo', 1972, 1990, ['rock', 'brazil'], [], -0.1, 0.45, 70, 'br', true, 'Da Rolling Stone brasileira de 1972 ao rock dos 80.', 'From the 1972 Brazilian Rolling Stone to 80s rock.'),
  k('Arthur Dapieve', 'O Globo', 1985, 2025, ['rock', 'brazil'], [], 0, 0.5, 70, 'br', true, 'Escreveu a história do BRock.', 'Wrote the history of 80s Brazilian rock.'),
  // fictícios: mercados e épocas sem crítico
  k('Odete Barrozo', 'Rádio Nacional (crônica)', 1940, 1965, ['brazil', 'latin'], ['rock'], 0.6, 0.3, 58, 'br', false, 'Elege a rainha do rádio pelo número de cartas.', 'Crowns the radio queen by fan-letter count.'),
  k('Kwame Asante', 'Accra Graphic', 1958, 1995, ['africa', 'blues_jazz'], [], 0.2, 0.4, 60, 'africa', false, 'Mede o highlife pela pista de dança de sábado.', 'Measures highlife by the Saturday dance floor.'),
  k('Mariko Tanabe', 'Ongaku Weekly', 1965, 2005, ['asia_me', 'pop', 'rock'], [], 0.3, 0.5, 62, 'asia', false, 'Ouve cada disco duas vezes: uma de pé, uma sentada.', 'Hears every record twice: once standing, once sitting.'),
  k('Rafael Quiroga', 'Revista Pelo', 1970, 2001, ['rock', 'latin'], ['pop'], -0.3, 0.6, 64, 'latam', false, 'Defende o rock em espanhol contra a censura.', 'Defends Spanish-language rock against the censors.'),
  k('Bronwyn Hale', 'Rolling Down Under', 1972, 2010, ['rock', 'pop'], [], 0.3, 0.45, 60, 'oceania', false, 'Odeia sotaque americano fingido.', 'Hates fake American accents.'),
  k('Dex Morrow', 'Sinal Fraco (blog MP3)', 2002, 2030, ['rock', 'electronic'], ['pop'], -0.8, 0.5, 58, 'global', false, 'Posta MP3 vazado com resenha de duas linhas.', 'Posts leaked MP3s with two-line reviews.'),
  k('Nia Clarke', 'Hot Take Daily', 2015, 2040, ['pop', 'hiphop', 'rnb'], [], 0.6, 0.35, 56, 'global', false, 'Fio de 40 tuítes por álbum.', '40-tweet thread per album.'),
];
