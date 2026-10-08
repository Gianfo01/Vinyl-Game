// Modo "nomes reais" (rodada 6, opcional, para uso pessoal): troca o universo ficcional pelos nomes
// reais — os 100 atos do catálogo (e integrantes conhecidos), as 22 gravadoras, festivais, veículos,
// plataformas, paradas, premiações e feiras. Ligado por RunConfig.realNames.
//
// Como funciona: applyRealNames(true) reescreve os nomes nos dados estáticos (guardando os originais
// para voltar ao modo ficcional) e liga um filtro de texto em t() que troca nomes fixos que aparecem
// em frases ("WorldSound 100" → "Billboard Hot 100"). Atos e selos do estado são renomeados na
// criação do jogo (gancho 'newgame' em sim/sys/realnames.ts).

import { FESTIVALS, MEDIA } from './catalog';

export interface RealAct { name: string; members?: string[] }

export const REAL_ACTS: Record<number, RealAct> = {
  1: { name: 'Bessie Smith' },
  2: { name: 'Louis Armstrong' },
  3: { name: 'Duke Ellington Orchestra', members: ['Duke Ellington', 'Johnny Hodges', 'Cootie Williams', 'Harry Carney', 'Sonny Greer', 'Barney Bigard'] },
  4: { name: 'Carlos Gardel' },
  5: { name: 'Robert Johnson' },
  6: { name: 'Carmen Miranda' },
  7: { name: 'Quintette du Hot Club de France', members: ['Django Reinhardt', 'Stéphane Grappelli', 'Joseph Reinhardt', 'Louis Vola'] },
  8: { name: 'Jimmie Rodgers' },
  9: { name: 'Édith Piaf' },
  10: { name: 'Noel Rosa' },
  11: { name: 'Frank Sinatra' },
  12: { name: 'Billie Holiday' },
  13: { name: 'Hank Williams' },
  14: { name: 'Elvis Presley', members: ['Elvis Presley', 'Scotty Moore'] },
  15: { name: 'Chuck Berry' },
  16: { name: 'Fats Domino' },
  17: { name: 'Johnny Cash & the Tennessee Two', members: ['Johnny Cash', 'Luther Perkins'] },
  18: { name: 'João Gilberto' },
  19: { name: 'Mina' },
  20: { name: 'Celia Cruz' },
  21: { name: 'Dave Brubeck Quartet', members: ['Dave Brubeck', 'Paul Desmond', 'Eugene Wright', 'Joe Morello'] },
  22: { name: 'Ray Charles' },
  23: { name: 'Luiz Gonzaga', members: ['Luiz Gonzaga', 'Zé Dantas'] },
  24: { name: 'Ravi Shankar' },
  25: { name: 'Cartola' },
  26: { name: 'The Beatles', members: ['John Lennon', 'Paul McCartney', 'George Harrison', 'Ringo Starr'] },
  27: { name: 'The Rolling Stones', members: ['Mick Jagger', 'Keith Richards', 'Brian Jones', 'Charlie Watts'] },
  28: { name: 'Bob Dylan' },
  29: { name: 'The Beach Boys', members: ['Brian Wilson', 'Mike Love', 'Carl Wilson', 'Dennis Wilson'] },
  30: { name: 'The Jimi Hendrix Experience', members: ['Jimi Hendrix', 'Noel Redding', 'Mitch Mitchell'] },
  31: { name: 'Janis Joplin' },
  32: { name: 'Aretha Franklin' },
  33: { name: 'James Brown' },
  34: { name: 'Os Mutantes', members: ['Rita Lee', 'Arnaldo Baptista', 'Sérgio Dias'] },
  35: { name: 'Elis Regina' },
  36: { name: 'Serge Gainsbourg' },
  37: { name: 'The Velvet Underground', members: ['Lou Reed', 'John Cale', 'Sterling Morrison', 'Moe Tucker'] },
  38: { name: 'Pink Floyd', members: ['Syd Barrett', 'Roger Waters', 'Richard Wright', 'Nick Mason'] },
  39: { name: 'The Supremes', members: ['Diana Ross', 'Mary Wilson', 'Florence Ballard'] },
  40: { name: 'Led Zeppelin', members: ['Robert Plant', 'Jimmy Page', 'John Paul Jones', 'John Bonham'] },
  41: { name: 'Fela Kuti & Africa 70', members: ['Fela Kuti', 'Tony Allen', 'Igo Chico', 'Lekan Animashaun', 'Tunde Williams', 'Henry Kofi'] },
  42: { name: 'Roberto Carlos' },
  43: { name: 'David Bowie' },
  44: { name: 'Queen', members: ['Freddie Mercury', 'Brian May', 'Roger Taylor', 'John Deacon'] },
  45: { name: 'Black Sabbath', members: ['Ozzy Osbourne', 'Tony Iommi', 'Geezer Butler', 'Bill Ward'] },
  46: { name: 'Bob Marley & The Wailers', members: ['Bob Marley', 'Peter Tosh', 'Bunny Wailer', 'Aston Barrett'] },
  47: { name: 'Marvin Gaye' },
  48: { name: 'ABBA', members: ['Agnetha Fältskog', 'Björn Ulvaeus', 'Benny Andersson', 'Anni-Frid Lyngstad'] },
  49: { name: 'Donna Summer' },
  50: { name: 'Bee Gees', members: ['Barry Gibb', 'Robin Gibb', 'Maurice Gibb'] },
  51: { name: 'Ramones', members: ['Joey Ramone', 'Johnny Ramone', 'Dee Dee Ramone', 'Tommy Ramone'] },
  52: { name: 'Sex Pistols', members: ['Johnny Rotten', 'Steve Jones', 'Glen Matlock', 'Paul Cook'] },
  53: { name: 'The Clash', members: ['Joe Strummer', 'Mick Jones', 'Paul Simonon', 'Topper Headon'] },
  54: { name: 'Patti Smith' },
  55: { name: 'Kraftwerk', members: ['Ralf Hütter', 'Florian Schneider', 'Wolfgang Flür'] },
  56: { name: 'Joni Mitchell' },
  57: { name: 'Parliament-Funkadelic', members: ['George Clinton', 'Bootsy Collins', 'Bernie Worrell', 'Eddie Hazel', 'Garry Shider'] },
  58: { name: 'Tim Maia' },
  59: { name: 'Fleetwood Mac', members: ['Stevie Nicks', 'Lindsey Buckingham', 'Christine McVie', 'Mick Fleetwood'] },
  60: { name: 'Milton Nascimento' },
  61: { name: 'Michael Jackson' },
  62: { name: 'Madonna' },
  63: { name: 'Prince' },
  64: { name: 'Whitney Houston' },
  65: { name: 'U2', members: ['Bono', 'The Edge', 'Adam Clayton', 'Larry Mullen Jr.'] },
  66: { name: 'The Smiths', members: ['Morrissey', 'Johnny Marr', 'Andy Rourke', 'Mike Joyce'] },
  67: { name: 'Joy Division', members: ['Ian Curtis', 'Bernard Sumner', 'Peter Hook', 'Stephen Morris'] },
  68: { name: 'Depeche Mode', members: ['Dave Gahan', 'Martin Gore', 'Andy Fletcher', 'Vince Clarke'] },
  69: { name: 'Run-DMC', members: ['Joseph Simmons', 'Darryl McDaniels', 'Jam Master Jay'] },
  70: { name: 'Public Enemy', members: ['Chuck D', 'Flavor Flav', 'Terminator X', 'Professor Griff'] },
  71: { name: 'Metallica', members: ['James Hetfield', 'Lars Ulrich', 'Kirk Hammett', 'Cliff Burton'] },
  72: { name: "Guns N' Roses", members: ['Axl Rose', 'Slash', 'Duff McKagan', 'Izzy Stradlin'] },
  73: { name: 'Legião Urbana', members: ['Renato Russo', 'Dado Villa-Lobos', 'Marcelo Bonfá', 'Renato Rocha'] },
  74: { name: 'Yellow Magic Orchestra', members: ['Haruomi Hosono', 'Ryuichi Sakamoto', 'Yukihiro Takahashi'] },
  75: { name: 'Soda Stereo', members: ['Gustavo Cerati', 'Zeta Bosio', 'Charly Alberti'] },
  76: { name: 'Nirvana', members: ['Kurt Cobain', 'Krist Novoselic', 'Dave Grohl'] },
  77: { name: 'Radiohead', members: ['Thom Yorke', 'Jonny Greenwood', "Ed O'Brien", 'Colin Greenwood'] },
  78: { name: 'Oasis', members: ['Liam Gallagher', 'Noel Gallagher', 'Paul Arthurs', 'Paul McGuigan'] },
  79: { name: 'Spice Girls', members: ['Melanie Brown', 'Melanie Chisholm', 'Emma Bunton', 'Geri Halliwell'] },
  80: { name: 'Backstreet Boys', members: ['Nick Carter', 'Brian Littrell', 'AJ McLean', 'Howie Dorough'] },
  81: { name: 'A Tribe Called Quest', members: ['Q-Tip', 'Phife Dawg', 'Ali Shaheed Muhammad'] },
  82: { name: 'Dr. Dre', members: ['Dr. Dre', 'Snoop Dogg', 'Nate Dogg'] },
  83: { name: 'Wu-Tang Clan', members: ['RZA', 'GZA', 'Method Man', 'Raekwon', 'Ghostface Killah'] },
  84: { name: 'Daft Punk', members: ['Thomas Bangalter', 'Guy-Manuel de Homem-Christo'] },
  85: { name: 'Shakira' },
  86: { name: 'Buena Vista Social Club', members: ['Compay Segundo', 'Ibrahim Ferrer', 'Rubén González', 'Omara Portuondo', 'Eliades Ochoa'] },
  87: { name: 'Beyoncé' },
  88: { name: 'Chitãozinho & Xororó', members: ['Chitãozinho', 'Xororó'] },
  89: { name: 'Taylor Swift' },
  90: { name: 'Kendrick Lamar' },
  91: { name: 'Bad Bunny' },
  92: { name: 'Anitta' },
  93: { name: 'Wizkid' },
  94: { name: 'Billie Eilish' },
  95: { name: 'BTS', members: ['RM', 'Jin', 'Suga', 'J-Hope', 'Jungkook'] },
  96: { name: "Girls' Generation", members: ['Taeyeon', 'Yoona', 'Tiffany', 'Sunny', 'Yuri'] },
  97: { name: 'Skrillex' },
  98: { name: '100 gecs', members: ['Laura Les', 'Dylan Brady'] },
  99: { name: 'Hatsune Miku' },
  100: { name: 'Brian Eno' },
};

export const REAL_LABELS: Record<string, string> = {
  imperial: 'Columbia Records',
  blackbird: 'Rough Trade Records',
  nova: 'Interscope Records',
  heritage: 'Rhino Records',
  meridian: 'EMI',
  atlas: 'Polydor',
  harbor: 'Motown',
  granite: 'Metal Blade Records',
  southern_cross: 'Fania Records',
  dragonfly: 'SM Entertainment',
  sol_maior: 'Elenco',
  carioca_fono: 'Chantecler',
  palmwine: 'Decca West Africa',
  northern_lights: 'Stockholm Records',
  cipher_street: 'Def Jam Recordings',
  foundry_wave: 'Factory Records',
  gold_prairie: 'Monument Records',
  sunset_parkway: 'Asylum Records',
  swiftrelease: 'TuneCore',
  wayfarer: 'Claddagh Records',
  livewire: 'Live Nation',
  cortex: 'Crypton Future Media',
};

/** Trocas de texto fixo (frases geradas com nomes ficcionais embutidos). */
export const REAL_TEXT: [string, string][] = [
  ['WorldSound 100', 'Billboard Hot 100'],
  ['WorldSound Albums', 'Billboard 200'],
  ['WorldSound Weekly', 'Billboard'],
  ['Gramófonos de Ouro', 'Grammy Awards'],
  ['Golden Gramophones', 'Grammy Awards'],
  ['Gramófonos', 'Grammys'],
  ['Gramophones', 'Grammys'],
  ['Hall of Echoes', 'Rock & Roll Hall of Fame'],
  ['Bolsa Sonora', 'Bolsa de Nova York'],
  ['Sound Exchange', 'New York Stock Exchange'],
  ['Prêmio Sabiá (Brasil)', 'Prêmio da Música Brasileira'],
  ['Sabiá Award (Brazil)', 'Brazilian Music Award'],
  ['Prêmio Águia (América do Norte)', 'American Music Awards'],
  ['Eagle Award (North America)', 'American Music Awards'],
  ['Prêmio Condor (América Latina)', 'Latin Grammy'],
  ['Condor Award (Latin America)', 'Latin Grammy'],
  ['Prêmio Farol (Europa)', 'BRIT Awards / MTV EMA'],
  ['Lighthouse Award (Europe)', 'BRIT Awards / MTV EMA'],
  ['Prêmio Lótus (Ásia)', 'MAMA Awards'],
  ['Lotus Award (Asia)', 'MAMA Awards'],
  ['Prêmio Baobá (África)', 'AFRIMA'],
  ['Baobab Award (Africa)', 'AFRIMA'],
  ['Prêmio Cruzeiro (Oceania)', 'ARIA Awards'],
  ['Southern Cross Award (Oceania)', 'ARIA Awards'],
  ['Feira Internacional de Música', 'MIDEM'],
  ['International Music Market', 'MIDEM'],
  ['Festival de Vitrines', 'SXSW'],
  ['Showcase Festival', 'SXSW'],
  ['Feira de Colônia', 'Popkomm'],
  ['Cologne Fair', 'Popkomm'],
  ['Expo Mundial de Música', 'WOMEX'],
  ['World Music Expo', 'WOMEX'],
];

// ---------------------------------------------------------------- aplicação

const originals = { fest: new Map<object, string>(), media: new Map<object, string>() };
let active = false;
let rx: RegExp | null = null;
let map: Record<string, string> = {};

const clean = (ref: string) => ref.replace(/\s*\([^)]*\)\s*$/, '').trim();

function buildFilter(): void {
  map = {};
  for (const [a, b] of REAL_TEXT) map[a] = b;
  for (const f of FESTIVALS) { const o = originals.fest.get(f); if (o && o !== f.name) map[o] = f.name; }
  for (const m of MEDIA) { const o = originals.media.get(m); if (o && o !== m.name) map[o] = m.name; }
  const keys = Object.keys(map).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  rx = keys.length ? new RegExp(keys.join('|'), 'g') : null;
}

/** Liga/desliga os nomes reais nos dados estáticos e no filtro de texto. Idempotente. */
export function applyRealNames(on: boolean): void {
  if (on === active) return;
  if (!originals.fest.size) {
    for (const f of FESTIVALS) originals.fest.set(f, f.name);
    for (const m of MEDIA) originals.media.set(m, m.name);
  }
  for (const f of FESTIVALS) f.name = on && f.realRef ? clean(f.realRef) : originals.fest.get(f) ?? f.name;
  for (const m of MEDIA) {
    const ref = m.realRef;
    // referências genéricas ("college radio") continuam com o nome do jogo
    m.name = on && ref && /^[A-Z0-9]/.test(ref) ? clean(ref) : originals.media.get(m) ?? m.name;
  }
  active = on;
  if (on) buildFilter();
  else rx = null;
}

export function realNamesActive(): boolean {
  return active;
}

/** Filtro aplicado ao texto final mostrado na tela. */
export function realText(s: string): string {
  if (!rx || !s) return s;
  return s.replace(rx, (m0) => map[m0] ?? m0);
}
