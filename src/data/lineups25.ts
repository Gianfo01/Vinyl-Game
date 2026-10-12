// Rodada 25: formações reais incompletas nas listas (banda de 5 aparecia com 2–3). `add` soma integrantes ao fim;
// `set` troca a lista toda. Formato RealMember: [nome, papel, nasc, morte, entrou, saiu] (undefined = desconhecido/desde o início).
// Só integrantes oficiais bem documentados; datas incertas ficam em branco.
import type { RealMember } from './realtypes';

const U = undefined;

export const LINEUPS25: Record<string, { add?: RealMember[]; set?: RealMember[] }> = {
  'Maroon 5': { add: [['Matt Flynn', 'drums', U, U, 2006], ['PJ Morton', 'keys', 1981, U, 2012], ['Sam Farrar', 'bass', U, U, 2016]] },
  'Bon Jovi': { add: [['Hugh McDonald', 'bass', U, U, 2016], ['Phil X', 'guitar', U, U, 2016]] },
  KISS: { add: [['Bruce Kulick', 'guitar', U, U, 1984, 1996], ['Eric Singer', 'drums', U, U, 1991, 1996], ['Tommy Thayer', 'guitar', U, U, 2002], ['Eric Singer', 'drums', U, U, 2004]] },
  'Deep Purple': { add: [['Steve Morse', 'guitar', 1954, U, 1994, 2022], ['Don Airey', 'keys', 1948, U, 2002], ['Simon McBride', 'guitar', U, U, 2022]] },
  'Titãs': { add: [['Paulo Miklos', 'vocal', 1959, U, U, 2016], ['Charles Gavin', 'drums', U, U, 1985, 2010]] },
  'Toto': { add: [['Bobby Kimball', 'vocal', 1947, U, U, 1984], ['Steve Porcaro', 'keys', 1957, U, U, 1987], ['David Hungate', 'bass', U, U, U, 1982], ['Mike Porcaro', 'bass', 1955, 2015, 1982, 2007]] },
  'Slipknot': { set: [['Corey Taylor', 'vocal', 1973], ['Mick Thomson', 'guitar', 1973], ['Jim Root', 'guitar', 1971], ['Joey Jordison', 'drums', 1975, 2021, U, 2013],
    ['Shawn Crahan', 'drums', 1969], ['Paul Gray', 'bass', 1972, 2010], ['Sid Wilson', 'dj', 1977], ['Craig Jones', 'keys', U, U, U, 2023], ['Chris Fehn', 'drums', U, U, U, 2019]] },
  'Def Leppard': { set: [['Joe Elliott', 'vocal', 1959], ['Rick Savage', 'bass', 1960], ['Rick Allen', 'drums', 1963], ['Steve Clark', 'guitar', 1960, 1991],
    ['Pete Willis', 'guitar', U, U, U, 1982], ['Phil Collen', 'guitar', 1957, U, 1982], ['Vivian Campbell', 'guitar', 1962, U, 1992]] },
  'Angra': { set: [['Andre Matos', 'vocal', 1971, 2019, U, 2000], ['Kiko Loureiro', 'guitar', 1972, U, U, 2015], ['Rafael Bittencourt', 'guitar', 1971],
    ['Luís Mariutti', 'bass', U, U, U, 2000], ['Ricardo Confessori', 'drums', U, U, U, 2000], ['Edu Falaschi', 'vocal', U, U, 2001, 2012], ['Felipe Andreoli', 'bass', U, U, 2001], ['Fabio Lione', 'vocal', U, U, 2013]] },
  'Simple Minds': { add: [['Derek Forbes', 'bass', U, U, U, 1985], ['Mick MacNeil', 'keys', U, U, U, 1990], ['Brian McGee', 'drums', U, U, U, 1981]] },
  'CPM 22': { add: [['Wally', 'guitar'], ['Portoga', 'bass'], ['Japinha', 'drums']] },
  'NX Zero': { add: [['Fi Ricardo', 'guitar'], ['Caco Grandino', 'bass'], ['Daniel Weksler', 'drums']] },
  'Pato Fu': { add: [['Ricardo Koctus', 'bass']] },
  'Biquini Cavadão': { add: [['Carlos Coelho', 'guitar', U, U, 1985], ['Miguel Flores da Cunha', 'keys', U, U, 1985], ['Álvaro Birita', 'drums', U, U, 1985]] },
  'Cidade Negra': { set: [['Ras Bernardo', 'vocal', U, U, U, 1994], ['Toni Garrido', 'vocal', U, U, 1994], ['Bino Farias', 'bass'], ['Lazão', 'drums'], ['Da Gama', 'guitar']] },
};

/** Aplica as correções numa lista de artistas (sem duplicar nomes já presentes). */
export function applyLineups25<T extends { n: string; m?: RealMember[] }>(xs: T[]): void {
  for (const a of xs) {
    const fx = LINEUPS25[a.n];
    if (!fx || !a.m?.length) continue;
    if (fx.set) a.m = fx.set.map((m) => [...m] as RealMember);
    else if (fx.add) {
      const have = new Set(a.m.map((m) => `${m[0]}|${m[4] ?? ''}`));
      a.m = [...a.m, ...fx.add.filter((m) => !have.has(`${m[0]}|${m[4] ?? ''}`)).map((m) => [...m] as RealMember)];
    }
  }
}
