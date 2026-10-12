// Rodada 27 (F) — modelo de dados histórico proposto pelo usuário ("Arquivo 4"), adotado por partes:
//  1) integrantes com várias passagens (RealMember[6]) — normalizador que funde linhas repetidas da mesma pessoa;
//  2) laços de família com período e subtipo (KinMeta: biológico, adotivo, padrasto, afinidade, meio-irmão; casamento
//     com início/fim → cônjuge × ex-cônjuge pelo ano corrente);
//  3) uma pessoa com vários nomes e vários papéis (apelidos → nome canônico; solo + banda + produtor = a mesma pessoa);
//  4) composição separada da gravação (autores, tipo de versão, ano original × ano da edição);
//  5) procedência: confirmado (c) × aproximado (a) × não conferido (u) — o modo exato esconde o não conferido.
// Só dados e funções puras (sem estado de partida, sem RNG).
import type { Prov27, RealMember, RealPeriod } from './realtypes';
import { AUTHORS27 } from './audit27';

const U = undefined;
/** mesma normalização de realworld.canonKey (sem os apelidos) */
export const norm27 = (n: string): string => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- 3) apelidos

/** Apelido (normalizado) → nome canônico (normalizado). Um passo só: o destino nunca é outro apelido. */
export const ALIASES27: Record<string, string> = {
  // Spice Girls (P025): nomes artísticos e de casada → nome da ficha. Mel C já era "melanie c" (lineups16.ALIASES16)
  'mel b': 'melanie brown', 'melanie b': 'melanie brown', 'mel brown': 'melanie brown', 'scary spice': 'melanie brown',
  'mel c': 'melanie c', 'sporty spice': 'melanie c', 'baby spice': 'emma bunton', 'ginger spice': 'geri halliwell', 'geri horner': 'geri halliwell',
  'posh spice': 'victoria beckham', 'victoria adams': 'victoria beckham',
  // Radiohead (P026)
  'phil selway': 'philip selway',
  // J Dilla (P035): produtor e carreira solo são a mesma pessoa
  'jay dee': 'j dilla', 'dilla': 'j dilla', 'james yancey': 'j dilla', 'james dewitt yancey': 'j dilla',
  // família de Elis (P040) e de Lennon (P038)
  'joao marcelo boscoli': 'joao marcello boscoli', 'cynthia powell': 'cynthia lennon',
  // nomes de batismo dos novos/pesquisados
  'dinahir tostes caymmi': 'nana caymmi', 'dorival tostes caymmi': 'dori caymmi', 'danilo candido tostes caymmi': 'danilo caymmi',
  'maria rosa canellas': 'rosinha de valenca', 'luiz gonzaga do nascimento junior': 'gonzaguinha', 'luiz gonzaga do nascimento jr': 'gonzaguinha',
  'luiz antonio ferreira goncalves': 'tom capone', 'geetali norah shankar': 'norah jones', 'jessica jung': 'jessica',
  'jorge ben': 'jorge ben jor',
  // BTS (P018): nomes de registro
  'kim nam joon': 'rm', 'kim seok jin': 'jin', 'min yoon gi': 'suga', 'jung ho seok': 'j hope', 'park ji min': 'jimin', 'kim tae hyung': 'v', 'jeon jung kook': 'jungkook',
};

/** Homônimos conhecidos (pessoas DIFERENTES com o mesmo nome): nunca são unificados nem harmonizados entre cópias. */
export const HOMONYMS27 = new Set<string>([
  'randy jackson', // Jackson 5 (1961) × baixista do Journey/jurado do American Idol (1956)
  'roger taylor', // Queen (1949) × Duran Duran (1960)
  'mick jones', // Foreigner (1944) × The Clash (1955)
  'renato rocha', // Legião Urbana (1961) × Detonautas Roque Clube (1971)
  'andy bell', // Erasure (1964) × Ride/Oasis/Beady Eye (1970)
  'ricky wilson', // The B-52's (1953–1985) × Kaiser Chiefs (1978)
  'steve clark', // Def Leppard (1960–1991) × Kaleidoscope (anos 60)
]);

// ---------------------------------------------------------------- 1) passagens

const key = norm27;
/** nomes (ato › integrante) cujas linhas repetidas foram fundidas — deve ficar vazio: os dados usam o 7º campo */
export const MERGED27: string[] = [];

/** Passagens ordenadas e sem sobreposição. */
export function cleanPeriods27(ps: RealPeriod[]): RealPeriod[] {
  const xs = ps.map(([a, b]) => [a, b] as RealPeriod).sort((p, q) => (p[0] ?? -1e9) - (q[0] ?? -1e9));
  const out: RealPeriod[] = [];
  for (const p of xs) {
    const last = out[out.length - 1];
    if (last && (last[1] === U || (p[0] !== U && p[0] <= last[1]))) { if (last[1] !== U && (p[1] === U || p[1] > last[1])) last[1] = p[1]; continue; }
    out.push(p);
  }
  return out.map((p) => (p[1] === U ? [p[0]] as RealPeriod : p)); // passagem em aberto: [entrou]
}

/** Funde linhas repetidas da mesma pessoa num ato em uma linha com passagens; entrou/saiu = 1ª entrada/última saída. */
export function mergePeriods27(m: RealMember[] | undefined, actName = ''): RealMember[] | undefined {
  if (!m?.length) return m;
  const out: RealMember[] = [];
  const at = new Map<string, number>();
  for (const x of m) {
    const k = key(x[0]);
    const i = at.get(k);
    const y = out[i ?? -1];
    if (y && (y[2] === U || x[2] === U || y[2] === x[2])) {
      MERGED27.push(`${actName} › ${x[0]}`);
      const ps = [...(y[6] ?? [[y[4], y[5]] as RealPeriod]), ...(x[6] ?? [[x[4], x[5]] as RealPeriod])];
      for (const j of [2, 3] as const) if (y[j] === U && x[j] !== U) y[j] = x[j];
      y[6] = ps;
      continue;
    }
    at.set(k, out.length);
    out.push(x);
  }
  for (const x of out) {
    if (!x[6]) continue;
    const ps = cleanPeriods27(x[6]);
    if (ps.length <= 1) { x[4] = ps[0]?.[0]; x[5] = ps[0]?.[1]; x.length = 6; while (x.length > 2 && x[x.length - 1] === U) x.pop(); continue; }
    x[4] = ps[0][0]; x[5] = ps[ps.length - 1][1]; x[6] = ps;
  }
  return out;
}

// ---------------------------------------------------------------- 2) laços com período e subtipo

export type KinSub27 = 'biological' | 'adoptive' | 'step' | 'in_law' | 'half';
/** Metadados de um laço (último item da linha, em kin15/kin25/kin27): subtipo, início/fim (casamento), procedência. */
export interface KinMeta27 { sub?: KinSub27; from?: number; to?: number; src?: Prov27 }
export const isKinMeta27 = (x: unknown): x is KinMeta27 => !!x && typeof x === 'object' && !Array.isArray(x);

// ---------------------------------------------------------------- 4) composição × gravação

/** Compositores reais que não são integrantes de ato nenhum (viram Pessoa quando o ato do parceiro entra). [nasc, morte?] */
export const WRITERS27: Record<string, [number, number?]> = {
  'Humberto Teixeira': [1915, 1979], 'Zé Dantas': [1921, 1962], Sivuca: [1930, 2006], 'Oswaldo Moles': [1913, 1967],
  'Zé Rodrix': [1947, 2009], Tavito: [1946, 2019], 'Rod Temperton': [1949, 2016], 'Siedah Garrett': [1960], 'Glen Ballard': [1953],
  'Adoniran Barbosa': [1910, 1982], 'John Phillips': [1935, 2001], 'Michelle Phillips': [1944],
};

/** Versão de uma gravação: estúdio, ao vivo, single, coletânea, relançamento. Coletânea/relançamento não são música nova. */
export type Version27 = 'studio' | 'live' | 'single' | 'compilation' | 'reissue';
/** Uma obra (composição) e a gravação de referência de um ato. */
export interface Work27 {
  /** título */
  t: string;
  /** autores (composição) */
  w: string[];
  /** ano original da composição/1º lançamento da obra */
  oy?: number;
  /** ato de referência (intérprete) */
  by?: string;
  src?: Prov27;
}
/** Obras com autoria conhecida (AUTHORS27 do C1 + pesquisa P006–P017). */
export const WORKS27: Work27[] = [
  // Luiz Gonzaga com Humberto Teixeira e com Zé Dantas (arquivo 2: só autoria)
  ...['Baião', 'No Meu Pé de Serra', 'Que Nem Jiló', 'Assum Preto'].map((t): Work27 => ({ t, w: ['Luiz Gonzaga', 'Humberto Teixeira'], by: 'Luiz Gonzaga' })),
  { t: 'Asa Branca', w: ['Luiz Gonzaga', 'Humberto Teixeira'], oy: 1947, by: 'Luiz Gonzaga' },
  ...['ABC do Sertão', 'Vozes da Seca', 'Forró de Mané Vito'].map((t): Work27 => ({ t, w: ['Luiz Gonzaga', 'Zé Dantas'], by: 'Luiz Gonzaga' })),
  { t: 'O Xote das Meninas', w: ['Luiz Gonzaga', 'Zé Dantas'], oy: 1953, by: 'Luiz Gonzaga', src: 'a' },
  { t: 'João e Maria', w: ['Chico Buarque', 'Sivuca'], oy: 1977, by: 'Nara Leão' },
  { t: 'Tiro ao Álvaro', w: ['Adoniran Barbosa', 'Oswaldo Moles'], oy: 1960, by: 'Elis Regina', src: 'a' },
  { t: 'Casa no Campo', w: ['Zé Rodrix', 'Tavito'], oy: 1971, by: 'Elis Regina' },
  { t: 'Fio Maravilha', w: ['Jorge Ben Jor'], oy: 1972, by: 'Jorge Ben Jor' },
  { t: "California Dreamin'", w: ['John Phillips', 'Michelle Phillips'], oy: 1965, by: 'The Mamas & the Papas' },
  { t: "Don't Let Me Down", w: ['John Lennon', 'Paul McCartney'], oy: 1969, by: 'The Beatles' },
  { t: 'Yellow Submarine', w: ['John Lennon', 'Paul McCartney'], oy: 1966, by: 'The Beatles' },
  { t: 'Under Pressure', w: ['Freddie Mercury', 'David Bowie', 'Brian May', 'Roger Taylor', 'John Deacon'], oy: 1981, by: 'Queen' },
  { t: 'Crazy Little Thing Called Love', w: ['Freddie Mercury'], oy: 1979, by: 'Queen' },
  { t: 'Another Brick in the Wall, Pt. 2', w: ['Roger Waters'], oy: 1979, by: 'Pink Floyd' },
  // Michael Jackson (P011; créditos de "background" ficam aproximados)
  { t: "Don't Stop 'Til You Get Enough", w: ['Michael Jackson'], oy: 1979, by: 'Michael Jackson' },
  { t: 'Rock with You', w: ['Rod Temperton'], oy: 1979, by: 'Michael Jackson' },
  { t: 'Off the Wall', w: ['Rod Temperton'], oy: 1979, by: 'Michael Jackson' },
  { t: 'Thriller', w: ['Rod Temperton'], oy: 1982, by: 'Michael Jackson' },
  { t: 'Beat It', w: ['Michael Jackson'], oy: 1982, by: 'Michael Jackson', src: 'a' },
  { t: 'Billie Jean', w: ['Michael Jackson'], oy: 1982, by: 'Michael Jackson', src: 'a' },
  { t: 'Bad', w: ['Michael Jackson'], oy: 1987, by: 'Michael Jackson' },
  { t: 'Man in the Mirror', w: ['Siedah Garrett', 'Glen Ballard'], oy: 1987, by: 'Michael Jackson' },
  { t: 'Smooth Criminal', w: ['Michael Jackson'], oy: 1987, by: 'Michael Jackson', src: 'a' },
];
// a lista de autoria do C1 (AUTHORS27) entra inteira: o que não estiver acima vira obra sem ato de referência
for (const [t, w] of Object.entries(AUTHORS27)) if (!WORKS27.some((x) => norm27(x.t) === norm27(t))) WORKS27.push({ t, w });
const WORK_IX = new Map<string, Work27[]>();
for (const w of WORKS27) { const k = key(w.t); WORK_IX.set(k, [...(WORK_IX.get(k) ?? []), w]); }
/** Obra pelo título (prefere a do mesmo ato). */
export function workOf27(title: string, actName?: string): Work27 | undefined {
  const xs = WORK_IX.get(key(title)) ?? WORK_IX.get(key(title.replace(/\s*[-–(].*$/, '')));
  if (!xs?.length) return undefined;
  return (actName ? xs.find((w) => w.by && key(w.by) === key(actName)) : undefined) ?? xs[0];
}

/** Uma gravação de um ato num catálogo de músicas (SONGS22): tipo de versão, ano da gravação (ry) × ano da edição (ey). */
export interface Take27 { v?: Version27; ry?: number; ey?: number; src?: Prov27; as?: string }
/** Pesquisa P006–P017: entradas de SONGS22 cujo ano era de edição (coletânea, relançamento, streaming) e não da gravação.
 *  artista → título como está na lista → gravação. `ry` vira o ano usado nas estreias; `as` renomeia (título original). */
export const TAKES27: Record<string, Record<string, Take27>> = {
  'The Beatles': { "Don't Let Me Down": { v: 'single', ry: 1969, ey: 1973 } },
  Queen: { 'Under Pressure': { v: 'single', ry: 1981, ey: 1982 }, 'Crazy Little Thing Called Love': { v: 'single', ry: 1979, ey: 1980 } },
  'Elis Regina': { 'Tiro Ao Álvaro': { v: 'studio', ry: 1980, ey: 1998, src: 'a' }, 'Casa No Campo': { v: 'studio', ry: 1972, ey: 2021 } },
  'Luiz Gonzaga': { 'O Xote das Meninas - Ela Só Quer Só Pensa em Namorar': { v: 'single', ry: 1953, ey: 2011, src: 'a', as: 'O Xote das Meninas' } },
  'Jorge Ben Jor': { 'Filho Maravilha': { v: 'studio', ry: 1972, ey: 1979, as: 'Fio Maravilha' } },
  'The Beach Boys': { "California Dreamin'": { v: 'single', ry: 1986, ey: 2022 } },
  'Pink Floyd': { 'Another Brick in the Wall, Pt. 2': { v: 'single', ry: 1979 }, 'Another Brick in the Wall, (Pt. 2)': { v: 'live', ry: 1995 } },
};
/** Músicas que faltavam (pesquisa P011: repertório de Michael Jackson, além de "Beat It"). [título, ano da gravação] */
export const SONGADD27: Record<string, [string, number][]> = {
  'Michael Jackson': [["Don't Stop 'Til You Get Enough", 1979], ['Rock with You', 1979], ['Off the Wall', 1979], ['Thriller', 1982], ['Billie Jean', 1982],
    ['Bad', 1987], ['Man in the Mirror', 1987], ['Smooth Criminal', 1987], ['Black or White', 1991], ['Remember the Time', 1991], ['Earth Song', 1995]],
};

/** Lista de músicas de um ato pronta para as estreias: título original, ano da gravação, sem relançamentos/coletâneas e sem
 *  repetir a mesma obra (a versão ao vivo de uma música já lançada não é música nova). */
export function songList27(actName: string, xs: [string, number][]): [string, number][] {
  const tk = TAKES27[actName] ?? {};
  const add = SONGADD27[actName] ?? [];
  const out: [string, number][] = [];
  const seen = new Set<string>();
  for (const [t0, y0] of [...xs, ...add]) {
    const k0 = norm27(t0).replace(/ /g, '');
    const tkk = tk[t0];
    if (tkk && (tkk.v === 'compilation' || tkk.v === 'reissue') && tkk.ry === U) continue; // edição sem gravação nova
    const t = tkk?.as ?? t0;
    const y = tkk?.ry ?? y0;
    const k = norm27(t).replace(/ /g, '');
    if (seen.has(k) || seen.has(k0)) continue;
    seen.add(k); seen.add(k0);
    out.push([t, y]);
  }
  return out.sort((a, b) => a[1] - b[1]);
}
/** Gravação (versão/edição) conhecida de uma música do ato. */
export function takeOf27(actName: string, title: string): Take27 | undefined {
  const tk = TAKES27[actName];
  if (!tk) return undefined;
  const k = norm27(title);
  return Object.entries(tk).find(([t, x]) => norm27(t) === k || (x.as && norm27(x.as) === k))?.[1];
}

// ---------------------------------------------------------------- 5) procedência

/** Integrantes com datas aproximadas (a) ou não conferidos (u), por ato. Não conferido some do modo exato. */
export const MEMBER_PROV27: Record<string, Record<string, Prov27>> = {
  'The Jackson 5': { 'Marlon Jackson': 'a', 'Jermaine Jackson': 'a' },
  'AC/DC': { 'Simon Wright': 'a', 'Chris Slade': 'a', 'Mark Evans': 'a', 'Dave Evans': 'a', 'Cliff Williams': 'a', 'Phil Rudd': 'a', 'Brian Johnson': 'a', 'Stevie Young': 'a' },
  'Fleetwood Mac': { 'Dave Walker': 'a', 'Bob Weston': 'a', 'Stevie Nicks': 'a', 'Neil Finn': 'a', 'Mike Campbell': 'a', 'Lindsey Buckingham': 'a' },
  'Pink Floyd': { 'Richard Wright': 'a', 'Bob Klose': 'a' },
  'Titãs': { 'Ciro Pessoa': 'a', 'André Jung': 'a', 'Charles Gavin': 'a', 'Nando Reis': 'a', 'Beto Lee': 'a' },
  'Spice Girls': { 'Geri Halliwell': 'a' },
  Molejo: { 'Willian Araújo': 'a', Andrezinho: 'u', 'Lúcio Nascimento': 'a', 'Jimmy Batera': 'a', 'Robson Calazans': 'a', 'Marquinhos Pato': 'a', Claumirzinho: 'a' },
  Cambriana: { 'Eduardo Carneiro': 'u', 'Wanderson Meireles': 'u' },
  KISS: { 'Eric Singer': 'a' },
  'Franco & TPOK Jazz': { 'Madilu System': 'a' }, Exaltasamba: { Thiaguinho: 'a' }, 'La Sonora Matancera': { 'Valentín Cané': 'a', 'Rogelio Martínez': 'a', 'Celio González': 'a' },
  'The Red Army Choir': { 'Valery Khalilov': 'a' }, 'Les Ballets Africains': { 'Mañana Cissé': 'u', 'Keita Fodeba': 'a' }, 'Furacão 2000': { 'Gilberto Guarani': 'u', 'Rômulo Costa': 'a' },
  'I Virtuosi Italiani': { 'Corrado Rovaris': 'u' }, 'Grupo Frontera': { 'Adelaido "Payo" Solís III': 'a', 'Brian Ortega': 'a' }, 'Comunidade Nin-jitsu': { 'Mano Changes': 'u' },
  'Turma do Pagode': Object.fromEntries(['Leiz', 'Rubinho', 'Neni', 'Marcelinho', 'Thiagão', 'Fabiano', 'Caramelo', 'Leandro Filé'].map((n) => [n, 'u' as Prov27])),
  Sports: { 'Cale Chronister': 'u', 'Christian Theriot': 'u' }, 'Síntese': { Neto: 'u', 'Léo': 'u' },
  BNK48: { Music: 'a', Pun: 'a', Pupe: 'a', Mobile: 'a', Jane: 'a', Kaew: 'a', Namneung: 'a', Orn: 'a', Noey: 'a', Nink: 'a' },
};
export const memberProv27 = (actName: string, member: string): Prov27 | undefined => MEMBER_PROV27[actName]?.[member];

export const PROV27_TXT: Record<Prov27 | 'sim', [string, string]> = {
  c: ['confirmado', 'confirmed'], a: ['aproximado', 'approximate'], u: ['não conferido', 'unverified'], sim: ['simulado', 'simulated'],
};
