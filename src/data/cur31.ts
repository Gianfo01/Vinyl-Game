// R31 · onda 3 (Z) — CONTEÚDO COM CURADORIA (plano-pagina.md, "Contratos de dados": Conteúdo com curadoria). Cada artista,
// banda de ficção, personagem, pessoa da TV, marca e relíquia nova tem: nome, apelidos, tipo (pessoa, banda, personagem,
// referência), anos, cidade, língua, fontes e campos a confirmar. A ficha é montada a partir dos dados (base31acts,
// relics31, fiction31, fossati31) + o que só a curadoria sabe (`NOTE31`: apelidos, fontes específicas, dúvidas,
// homenagem). Apresentadores (Chacrinha, Silvio Santos, Gugu) são pessoas da TV e só têm discografia onde gravaram.
// Todo nome real de terceiros daqui tem registro em realnames31 (espaço 'cur', chave = id da ficha).
import { BASE31_ACTS } from './base31acts';
import { FICTION31 } from './fiction31';
import { FAMILY31, FAM_CITY31, FAM_ORIGIN31 } from './fossati31';
import { RELICS31 } from './relics31';
import type { RealArtist } from './realtypes';
import { HITS31_SRC } from './base31hits';
import { CHART31_SRC, hitSources31, type HitSrc31 } from './hits31types';
import { homage31 } from './homage31';

export type CurTipo31 = 'pessoa' | 'banda' | 'personagem' | 'referencia';
export type CurArea31 = 'artista' | 'tv' | 'reliquia' | 'ficcao' | 'familia' | 'marca';
export interface Cur31 {
  /** id estável da ficha (também a chave 'cur:<id>' no registro de nomes reais) */
  id: string;
  nome: string;
  apelidos: string[];
  tipo: CurTipo31;
  area: CurArea31;
  /** [início, fim?] — fim ausente = em aberto */
  anos: [number, number?];
  /** id de cidade do jogo ou, quando não há, o lugar por extenso */
  cidade: string;
  /** língua principal (ISO 639-1) */
  lingua: string;
  fontes: string[];
  /** campos ainda a confirmar (vazio = conferido) */
  confirmar: string[];
  /** onde o dado mora (id no arquivo de origem) */
  ref: string;
  /** homenagem quando "Nomes e obras reais" está desligado (família: sem homenagem — nome real sempre) */
  sub?: string;
}

export const slug31 = (n: string): string => n.toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

interface Note { ap?: string[]; f?: string[]; c?: string[]; sub: string; tipo?: CurTipo31; lang?: string; area?: CurArea31 }
/** O que só a curadoria sabe, por id. `sub` é obrigatório (homenagem consistente: o mesmo real → a mesma homenagem). */
const NOTE31: Record<string, Note> = {
  // ---- A1
  eliana: { ap: ['Eliana Michaelichen'], c: ['estreia solo (1991 ou 1993; antes no grupo Banana Split)', 'ano de "Os Dedinhos"'], sub: 'Eliane Mirim' },
  angelica: { ap: ['Angélica Ksyvickis'], sub: 'Angelina Táxi' },
  mara_maravilha: { c: ['ano do 1º LP'], sub: 'Mara Mirabela' },
  simony: { ap: ['Simony Benelli'], c: ['ano do 1º disco solo'], sub: 'Simone Balão' },
  turma_do_balao_magico: { ap: ['Balão Mágico'], c: ['nascimento de Tob', 'nascimento de Mike Biggs (1974 ou 1975)'], sub: 'Turma do Balão Azul' },
  trem_da_alegria: { c: ['cidade de origem', 'formação e datas (entrada de Amanda Acosta, Rubinho)', 'nascimentos'], sub: 'Trenzinho da Alegria' },
  paquitas: { c: ['formação de gravação', 'ano de fim'], sub: 'Assistentes do Castelo' },
  netinho: { ap: ['Netinho (ex-Banda Beijo)'], c: ['ano da estreia solo'], sub: 'Netinho do Trio' },
  klb: { ap: ['Kiko, Leandro e Bruno'], c: ['anos de nascimento dos irmãos Scornavacca'], sub: 'KBL Irmãos' },
  br_oz: { ap: ['Broz'], c: ['integrantes (Popstars/SBT)', 'ano de fim'], sub: 'Pop Oz' },
  chiquititas: { c: ['elenco da gravação', 'ano de fim'], tipo: 'personagem', sub: 'Pequenitas' },
  sergio_mallandro: { ap: ['Mallandro'], c: ['ano de "Glu-Glu"'], sub: 'Sérgio Malandreco' },
  patati_patata: { c: ['ano do 1º disco', 'intérpretes por época'], tipo: 'personagem', sub: 'Patiti Patatu' },
  galinha_pintadinha: { ap: ['Galinha Pintadinha DVD'], tipo: 'personagem', sub: 'Galinha Sarapintada' },
  palavra_cantada: { sub: 'Palavra Brincada' },
  bia_bedran: { c: ['ano de nascimento', 'ano do 1º disco'], sub: 'Bia Bem-Te-Vi' },
  domino: { c: ['formação de 1984 e trocas'], sub: 'Dama e Dominó' },
  polegar: { c: ['datas de entrada e saída'], sub: 'Indicador' },
  milton_guedes: { c: ['ano do 1º disco solo', 'ano de nascimento'], sub: 'Milton Sax' },
  chacrinha: { ap: ['Abelardo Barbosa', 'Velho Guerreiro'], tipo: 'pessoa', area: 'tv', c: ['discografia: confirmar o single "Maria Sapatão" (1980)'], f: ['Dicionário Cravo Albin da MPB', 'Memória Globo'], sub: 'Velho Guerreiro da TV' },
  silvio_santos: { ap: ['Senor Abravanel'], tipo: 'pessoa', area: 'tv', c: ['discografia (marchinhas dos anos 1960–80): títulos e anos'], f: ['Memória SBT', 'Discogs'], sub: 'Sílvio do Baú' },
  gugu: { ap: ['Gugu Liberato', 'Antônio Augusto Liberato'], tipo: 'pessoa', area: 'tv', c: [], f: ['Memória SBT'], sub: 'Guguzinho da TV' },
  // ---- A2 Brasil
  luiz_caldas: { sub: 'Luís do Fricote' },
  sarajane: { c: ['ano de "A Roda"', 'ano de nascimento'], sub: 'Sara da Roda' },
  asa_de_aguia: { c: ['nascimento de Durval Lelys'], sub: 'Asa de Gavião' },
  mastruz_com_leite: { c: ['formação'], sub: 'Mastruz com Mel' },
  roberta_miranda: { sub: 'Roberta Sabiá' },
  chrystian_ralf: { c: ['ano de estreia como dupla', 'nascimentos'], sub: 'Cristiano & Rafa' },
  wando: { sub: 'Wanderley da Paixão' },
  waldick_soriano: { sub: 'Waldo Soriano' },
  evaldo_braga: { sub: 'Evaldo Sorriso' },
  nelson_ned: { c: ['ano de estreia'], sub: 'Nelson Pequeno Gigante' },
  agnaldo_timoteo: { sub: 'Agnelo Timóteo' },
  agepe: { c: ['"primeiro samba a passar de 1 milhão": conferir'], sub: 'Agapê' },
  benito_di_paula: { sub: 'Benito de Paola' },
  gretchen: { ap: ['Rainha do Rebolado'], c: ['ano do single "Conga"'], sub: 'Gretel' },
  ritchie: { sub: 'Ricky Veneno' },
  angela_ro_ro: { c: ['ano de morte (2025?)'], sub: 'Ângela Rouca' },
  leo_jaime: { ap: ['ex-João Penca'], sub: 'Léo Jairo' },
  negritude_junior: { c: ['ano do 1º LP'], sub: 'Negritude Mirim' },
  kelly_key: { sub: 'Kelly Baba' },
  wanessa_camargo: { ap: ['Wanessa'], sub: 'Vanessa Camargos' },
  tati_quebra_barraco: { c: ['ano de estreia'], sub: 'Tati Barraco' },
  mc_guime: { sub: 'MC Guiné' },
  banda_uo: { sub: 'Banda Ué' },
  // ---- A2 América Latina
  timbiriche: { c: ['datas de entrada e saída de cada integrante'], sub: 'Timbirichi' },
  gloria_trevi: { sub: 'Glória Treva' },
  los_bukis: { c: ['cidade (são de Michoacán; cidade aproximada)'], sub: 'Los Buquis' },
  los_angeles_azules: { sub: 'Los Ángeles Celestes' },
  olga_tanon: { sub: 'Olga Tañana' },
  leo_dan: { c: ['ano de morte (2025?)'], sub: 'Leo Dano' },
  ricardo_arjona: { c: ['país de origem: Guatemala (o jogo não tem a Cidade da Guatemala)'], sub: 'Ricardo Arjuna' },
  // ---- A2 Europa
  demis_roussos: { ap: ['ex-Aphrodite\'s Child'], sub: 'Demis Rossos' },
  vicky_leandros: { lang: 'de', sub: 'Vicky Leandra' },
  dschinghis_khan: { ap: ['Genghis Khan'], lang: 'de', sub: 'Dschingis Kan' },
  isabel_pantoja: { sub: 'Isabel Pantera' },
  andre_rieu: { lang: 'nl', sub: 'André Rio' },
  // ---- A2 Ásia e África
  momoe_yamaguchi: { sub: 'Momo Yamaguchi' },
  akina_nakamori: { sub: 'Akina Nakamura' },
  pink_lady: { sub: 'Pink Dama' },
  dreams_come_true: { ap: ['DCT', 'Dori Kamu'], sub: 'Dreams Do Come' },
  wonder_girls: { sub: 'Wonder Gals' },
  kumar_sanu: { sub: 'Kumar Sanu Playback' },
  alka_yagnik: { sub: 'Alka Yagna' },
  sharon_cuneta: { lang: 'tl', sub: 'Sharon Cunha' },
  awilo_longomba: { lang: 'ln', sub: 'Awilo Longo' },
  yemi_alade: { sub: 'Yemi Alada' },
  mafikizolo: { c: ['nascimentos'], lang: 'zu', sub: 'Mafiki Zulu' },
  sam_mangwana: { lang: 'ln', sub: 'Sam Mangona' },
  // ---- relíquias (homenagem descritiva: sem nome de pessoa)
  messiah_strad: { ap: ['Le Messie', 'Messias'], f: ['Ashmolean Museum (coleção Hill, 1939)'], sub: 'O violino de Cremona que nunca foi tocado' },
  lady_blunt: { f: ['Tarisio (leilão de 2011)'], sub: 'O violino de Cremona de 1721' },
  vieuxtemps_guarneri: { f: ['Wikipedia (en)'], c: ['venda privada de 2012 (~US$ 16 mi)'], sub: 'O violino do virtuose belga' },
  joachim_ma_strad: { f: ['Sotheby\'s (fev/2025)'], c: ['valor e data do leilão de 2025'], sub: 'O violino do amigo de Brahms' },
  duport_cello: { c: ['venda depois de 2007 (comprador e valor)'], sub: 'O violoncelo da bota do imperador' },
  davidov_cello: { c: ['dono atual'], sub: 'O violoncelo da madrinha' },
  beethoven_broadwood: { f: ['Museu Nacional Húngaro'], c: ['ano exato da doação de Liszt (1874)'], sub: 'O piano inglês do mestre surdo' },
  mozart_walter: { f: ['Mozarteum, Salzburgo'], sub: 'O fortepiano do menino-prodígio' },
  alma_tadema_steinway: { f: ['Christie\'s (1997)', 'Clark Art Institute'], c: ['comprador de 1997 (o Clark?)'], sub: 'O piano pintado do banqueiro' },
  liberace_piano: { c: ['local atual (museu fechado em 2010)'], sub: 'O piano de cristais de Las Vegas' },
  prince_yellow_cloud: { c: ['ano da guitarra (1989?)', 'ano de entrada no Smithsonian', 'a outra Cloud amarela vendida a particular'], f: ['Smithsonian NMAAHC'], sub: 'A guitarra-nuvem amarela' },
  clapton_000_42: { f: ['Christie\'s, leilão Crossroads (jun/2004)'], sub: 'O violão do acústico de 1992' },
  lennon_help_framus: { f: ['Julien\'s Auctions (mai/2024)'], c: ['correção: o violão de "Help!" é o Framus de 12 cordas; o Gibson J-160E perdido já está na base (lennon_j160e)'], sub: 'O violão de 12 cordas do filme de 1965' },
  garcia_wolf: { f: ['Guernsey\'s (2002 e 2017)'], sub: 'A guitarra do lobo' },
  love_lyrics: { c: ['casa e ano do leilão (Sotheby\'s 2005?)'], sub: 'A letra da primeira transmissão mundial' },
  mj_fedora: { c: ['se é a mesma fedora do Motown 25', 'valor em dólar'], f: ['Artcurial (nov/2023)'], sub: 'O chapéu do passo lunar' },
  marilyn_dress: { f: ['Christie\'s (1999)', 'Julien\'s Auctions (nov/2016)'], sub: 'O vestido de cristais do aniversário presidencial' },
  elvis_pink_cadillac: { f: ['Graceland'], sub: 'O Cadillac rosa do Rei' },
  elvis_lisa_marie: { f: ['Graceland'], c: ['ano da exposição (1984)'], sub: 'O jato do Rei' },
  emi_redd51: { c: ['qual unidade existe hoje e onde'], sub: 'A mesa valvulada do Estúdio 2' },
  jobim_piano: { c: ['ano do piano', 'local atual (Instituto Antonio Carlos Jobim?)'], f: ['Instituto Antonio Carlos Jobim'], sub: 'O piano do Jardim Botânico' },
  raul_violao: { c: ['modelo e ano do instrumento', 'local atual'], sub: 'O violão do maluco beleza' },
  pixinguinha_sax: { c: ['se o instrumento está no IMS (o arquivo está)'], f: ['Instituto Moreira Salles'], sub: 'O saxofone do mestre do choro' },
  jacob_bandolim: { c: ['se o instrumento está no MIS-RJ (o arquivo está)'], f: ['MIS-RJ'], sub: 'O bandolim do virtuose' },
  joao_gilberto_violao: { c: ['ano', 'situação no espólio'], sub: 'O violão da batida' },
  chiquinha_piano: { c: ['ano', 'local atual'], sub: 'O piano da primeira marchinha' },
  chico_science_hat: { c: ['local atual'], sub: 'O chapéu do mangue' },
  jackson_pandeiro: { c: ['ano', 'local atual'], sub: 'O pandeiro do rei do ritmo' },
  // ---- marcas ligadas à família (seguem o interruptor)
  radio_89fm: { ap: ['89 A Rádio Rock'], tipo: 'referencia', area: 'marca', c: ['anos da Sonia na rádio (homenagem: 2000–2005)'], sub: 'Rádio 98 Rock' },
  radio_virgin: { ap: ['Virgin Radio'], tipo: 'referencia', area: 'marca', c: ['anos da Sonia na rádio (homenagem: 2006–2011)', 'nome e anos da Virgin em São Paulo'], sub: 'Rádio Vírgula' },
  radio_gazeta: { ap: ['Gazeta FM 88,1'], tipo: 'referencia', area: 'marca', c: ['anos da Sonia na rádio (homenagem: 2012–2020)'], sub: 'Rádio Folha FM' },
};

const FONTES_BR = ['Dicionário Cravo Albin da MPB', 'Discogs', 'Wikipédia (pt)'];
const FONTES_INT = ['Discogs', 'Wikipedia (en)'];
const AP_TXT: Record<string, string> = { d: 'ano de estreia', b: 'ano de nascimento', m: 'formação e datas dos integrantes', f: 'ano de formação', x: 'ano de morte' };
const LANG_CN: Record<string, string> = { BRA: 'pt', MEX: 'es', ARG: 'es', PRI: 'es', ESP: 'es', GRC: 'en', DEU: 'de', NLD: 'nl', JPN: 'ja', KOR: 'ko', IND: 'hi', TUR: 'tr', PHL: 'tl', COD: 'ln', NGA: 'en', ZAF: 'zu' };

function fromAct(a: RealArtist): Cur31 {
  const id = slug31(a.n);
  const n = NOTE31[id];
  const solo = !a.m?.length;
  const confirmar = [...(a.exact === false ? ['dados gerais (não conferidos: some do modo "Vida real exata")'] : []), ...(a.ap ?? []).map((k) => AP_TXT[k]), ...(n?.c ?? [])];
  return {
    id, nome: a.n, apelidos: n?.ap ?? [], tipo: n?.tipo ?? (solo ? 'pessoa' : 'banda'), area: n?.area ?? 'artista',
    anos: [solo && a.b ? a.b : a.d, a.e], cidade: a.c, lingua: n?.lang ?? LANG_CN[a.cn] ?? 'en',
    fontes: n?.f ?? (a.cn === 'BRA' ? FONTES_BR : FONTES_INT), confirmar: [...new Set(confirmar)], ref: `base31acts:${a.n}`, sub: n?.sub,
  };
}

const RELIC_CITY: Record<string, string> = {
  messiah_strad: 'Oxford', beethoven_broadwood: 'budapest', mozart_walter: 'Salzburgo', alma_tadema_steinway: 'Williamstown', liberace_piano: 'las_vegas',
  prince_yellow_cloud: 'washington', elvis_pink_cadillac: 'memphis', elvis_lisa_marie: 'memphis', emi_redd51: 'london', jobim_piano: 'rio', raul_violao: 'salvador',
  pixinguinha_sax: 'rio', jacob_bandolim: 'rio', joao_gilberto_violao: 'rio', chiquinha_piano: 'rio', chico_science_hat: 'recife', jackson_pandeiro: 'recife',
  garcia_wolf: 'san_francisco', marilyn_dress: 'los_angeles', clapton_000_42: 'new_york', lennon_help_framus: 'london', love_lyrics: 'london', mj_fedora: 'paris',
  lady_blunt: 'Cremona', vieuxtemps_guarneri: 'Cremona', joachim_ma_strad: 'Cremona', duport_cello: 'Cremona', davidov_cello: 'Cremona',
};
const RELIC_LANG: Record<string, string> = { jobim_piano: 'pt', raul_violao: 'pt', pixinguinha_sax: 'pt', jacob_bandolim: 'pt', joao_gilberto_violao: 'pt', chiquinha_piano: 'pt', chico_science_hat: 'pt', jackson_pandeiro: 'pt',
  messiah_strad: 'it', lady_blunt: 'it', vieuxtemps_guarneri: 'it', joachim_ma_strad: 'it', duport_cello: 'it', davidov_cello: 'it', beethoven_broadwood: 'de', mozart_walter: 'de' };

export const CUR31: Cur31[] = [
  ...BASE31_ACTS.map(fromAct),
  // Gugu: pessoa da TV sem discografia (criou o Dominó); não entra como ato
  { id: 'gugu', nome: 'Gugu Liberato', apelidos: NOTE31.gugu.ap!, tipo: 'pessoa', area: 'tv', anos: [1959, 2019], cidade: 'sao_paulo', lingua: 'pt', fontes: NOTE31.gugu.f!, confirmar: [], ref: 'cur31:gugu', sub: NOTE31.gugu.sub },
  ...RELICS31.map((r): Cur31 => {
    const n = NOTE31[r.id];
    const last = r.steps?.[r.steps.length - 1];
    return { id: r.id, nome: r.name.pt, apelidos: n?.ap ?? [], tipo: 'referencia', area: 'reliquia', anos: [r.year, last?.[0]], cidade: RELIC_CITY[r.id] ?? 'london', lingua: RELIC_LANG[r.id] ?? 'en',
      fontes: n?.f ?? ['docs/r31/artistas-reliquias.md (levantamento B2)'], confirmar: n?.c ?? [], ref: `relics31:${r.id}`, sub: n?.sub };
  }),
  ...FICTION31.map((f): Cur31 => ({
    id: `fic_${f.id}`, nome: f.n, apelidos: [], tipo: f.m.length > 1 ? 'banda' : 'personagem', area: 'ficcao', anos: [f.ano], cidade: f.c, lingua: f.lang,
    fontes: ['IMDb', 'Wikipedia (en)'], confirmar: f.lugar ? [`cidade do jogo aproximada (na obra: ${f.lugar})`] : [], ref: `fiction31:${f.id}`, sub: `${f.n.replace(/^The /, '')} (homenagem)`,
  })),
  ...(['radio_89fm', 'radio_virgin', 'radio_gazeta'] as const).map((id): Cur31 => {
    const n = NOTE31[id];
    const nome = { radio_89fm: '89 FM', radio_virgin: 'Virgin', radio_gazeta: 'Gazeta FM' }[id];
    const anos: [number, number] = { radio_89fm: [2000, 2005] as [number, number], radio_virgin: [2006, 2011] as [number, number], radio_gazeta: [2012, 2020] as [number, number] }[id];
    return { id, nome, apelidos: n.ap ?? [], tipo: 'referencia', area: 'marca', anos, cidade: 'sao_paulo', lingua: 'pt', fontes: ['homenagem da família (relato do autor)'], confirmar: n.c ?? [], ref: `fossati31:sonia`, sub: n.sub };
  }),
  ...FAMILY31.map((m): Cur31 => ({
    id: `fam_${m.id}`, nome: m.name, apelidos: [], tipo: 'pessoa', area: 'familia', anos: [1880], cidade: FAM_CITY31.id, lingua: 'it',
    fontes: ['homenagem da família (relato do autor)'], confirmar: m.id === 'gianluca' ? ['de quem é filho (Sonia ou Antonella)', 'ano de fundação da Arara'] : ['idade aparente (fixa)'], ref: `fossati31:${m.id}`,
  })),
];
void FAM_ORIGIN31;

// ---------------------------------------------------------------- R31 · onda 4 (BASE-HITS): sucessos de 1992 até hoje
// Ficha por ato de src/data/base31hits.ts: fontes = verbete da Wikipedia (en) + arquivo oficial da parada de cada hit;
// "a confirmar" lista o aproximado (estreia, cidade do jogo mais próxima) e o hit que não foi conferido por busca nesta
// rodada. Nome real no espaço próprio 'hit:<id>' de realnames31 (homenagem gerada por homage31, a mesma das bases grandes).
const LANG_HIT31: Record<string, string> = {
  USA: 'en', GBR: 'en', IRL: 'en', CAN: 'en', AUS: 'en', NZL: 'en', JAM: 'en', TTO: 'en', BRB: 'en', BHS: 'en', NGA: 'en', GHA: 'en', ZAF: 'en', KEN: 'en',
  MEX: 'es', ARG: 'es', COL: 'es', CHL: 'es', PER: 'es', VEN: 'es', PRI: 'es', DOM: 'es', CUB: 'es', PAN: 'es', URY: 'es', ECU: 'es', ESP: 'es', BOL: 'es', PRY: 'es', HND: 'es',
  FRA: 'fr', BEL: 'fr', CHE: 'de', DEU: 'de', AUT: 'de', NLD: 'nl', SWE: 'sv', NOR: 'no', DNK: 'da', FIN: 'fi', ISL: 'is', PRT: 'pt', GRC: 'el', TUR: 'tr',
  ROU: 'ro', POL: 'pl', RUS: 'ru', UKR: 'uk', JPN: 'ja', KOR: 'ko', CHN: 'zh', TWN: 'zh', HKG: 'zh', IND: 'hi', PHL: 'tl', ISR: 'he', CIV: 'fr', SEN: 'fr', COD: 'fr', CMR: 'fr', HTI: 'fr',
};
const hitId31 = (n: string): string => slug31(n) || 'x';
function fromHit(h: HitSrc31): Cur31 {
  const solo = !h.m?.length;
  const confirmar = [...(h.exact === false ? ['dados gerais (não conferidos: some do modo "Vida real exata")'] : []), ...(h.ap ?? []).map((k) => AP_TXT[k]),
    ...(h.ca ? ['cidade de origem (o jogo usa a cidade mais próxima)'] : []), ...(h.v ? [] : [`hit ("${h.h[0]}", ${h.h[1]}, ${CHART31_SRC[h.h[2]].split(' (')[0]} nº ${h.h[3]}): conferir no arquivo da parada`])];
  return {
    id: hitId31(h.n), nome: h.n, apelidos: h.nk ?? [], tipo: solo ? 'pessoa' : 'banda', area: 'artista', anos: [solo && h.b ? h.b : h.d, h.e],
    cidade: h.c, lingua: LANG_HIT31[h.cn] ?? 'en', fontes: hitSources31(h), confirmar, ref: `base31hits:${h.n}`, sub: homage31(h.n),
  };
}
/** Fichas da base de sucessos (espaço 'hit:<id>' no registro de nomes reais). */
export const CUR31_HITS: Cur31[] = HITS31_SRC.map(fromHit);

/** Ficha de curadoria por id (base Z, relíquias, ficção, família e, por último, a base de sucessos). */
export const cur31 = (id: string): Cur31 | undefined => CUR31.find((c) => c.id === id) ?? CUR31_HITS.find((c) => c.id === id);
