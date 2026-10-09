// Críticos regionais (rodada 8): cada mercado tem seus veículos e críticos, com gostos locais, ao
// longo das eras. Somam-se aos críticos globais de content.ts. Nomes de veículos ficcionais; o
// equivalente real (realRef) aparece no modo de nomes reais.

import type { MarketId } from './world';

export interface RegionalCritic {
  id: string;
  name: string;
  outlet: string;
  realRef?: string;
  region: MarketId;
  from: number;
  to: number;
  favors: string[];
  dislikes: string[];
  mainstream: number;
  harsh: number;
  prestige: number;
}

type Outlet = [outlet: string, realRef: string | undefined, from: number, to: number, favors: string[], dislikes: string[], mainstream: number, harsh: number, prestige: number, critics: [string, string]];

const REGIONS: Record<MarketId, Outlet[]> = {
  br: [
    ['Revista Melodia', 'Revista da Música Popular', 1925, 1962, ['brazil', 'blues_jazz'], ['rock'], 0.4, 0.45, 55, ['Aracy Pimentel', 'Otávio Lacerda']],
    ['Jornal do Disco', 'Jornal do Brasil (Caderno B)', 1958, 1998, ['brazil', 'blues_jazz', 'rock'], ['country_folk'], -0.2, 0.6, 72, ['Tárik Monteiro', 'Ruth Albuquerque']],
    ['Revista Somtrês', 'Somtrês', 1978, 1995, ['rock', 'brazil', 'electronic'], ['pop'], -0.1, 0.55, 60, ['Bento Arraes', 'Cida Valadares']],
    ['Ritmo Digital', 'Rolling Stone Brasil', 1996, 2040, ['brazil', 'rock', 'hiphop', 'pop'], [], 0.2, 0.5, 68, ['Lúcio Ramalho', 'Beatriz Caymmi']],
    ['Canal Batuque', 'Tenho Mais Discos Que Amigos!', 2008, 2040, ['brazil', 'rock', 'electronic'], ['pop'], -0.6, 0.65, 60, ['Duda Furtado', 'Heitor Brandão']],
  ],
  na: [
    ['Downtown Ledger', 'The New Yorker', 1925, 1975, ['blues_jazz', 'pop'], ['rock'], 0.1, 0.55, 75, ['Mabel Thornton', 'Floyd Ashcombe']],
    ['Groove Gazette', 'Cash Box', 1955, 1996, ['rnb', 'pop', 'rock'], [], 0.7, 0.25, 58, ['Otis Pemberton', 'Della Reyes']],
    ['Heartland Notes', 'Country Music People', 1945, 2040, ['country_folk', 'sacred'], ['electronic'], 0.4, 0.35, 55, ['Clyde Harlan', 'Opal Whitfield']],
    ['Static Review', 'Stereogum', 1999, 2040, ['rock', 'electronic', 'hiphop'], ['country_folk'], -0.5, 0.6, 66, ['Jade Okonkwo', 'Ezra Lindqvist']],
    ['Block Report', 'XXL', 1993, 2040, ['hiphop', 'rnb'], ['rock'], 0.3, 0.5, 64, ['Reggie Banks', 'Maya Holloway']],
  ],
  latam: [
    ['Tango y Son', 'Sintonía', 1925, 1975, ['latin', 'blues_jazz'], ['rock'], 0.5, 0.35, 55, ['Ernesto Paz', 'Rosario Lugo']],
    ['Cumbia Diario', 'El Tiempo (Lecturas)', 1950, 2005, ['latin', 'caribbean'], [], 0.6, 0.3, 50, ['Andrés Barrera', 'Pilar Ospina']],
    ['Sonido Azteca', 'Eres', 1965, 2040, ['latin', 'pop', 'rock'], [], 0.4, 0.45, 58, ['Mateo Villalobos', 'Ximena Duarte']],
    ['Rock & Pop Sur', 'Rolling Stone Argentina', 1985, 2040, ['rock', 'latin', 'electronic'], ['pop'], -0.3, 0.6, 66, ['Julio Ferraro', 'Soledad Ibarra']],
  ],
  eu: [
    ['Le Disque Bleu', 'Rock & Folk', 1950, 2005, ['europe', 'rock', 'blues_jazz'], ['country_folk'], -0.2, 0.6, 70, ['Lucien Marchal', 'Odile Ferrand']],
    ['Il Microsolco', 'Ciao 2001', 1958, 2010, ['europe', 'pop', 'rock'], [], 0.5, 0.4, 58, ['Gino Caruso', 'Rita Baldini']],
    ['Klangwelt', 'Spex', 1965, 2040, ['electronic', 'rock'], ['pop', 'country_folk'], -0.6, 0.7, 72, ['Florian Haas', 'Ute Brandt']],
    ['Ruta Sonora', 'Ruta 66', 1975, 2040, ['rock', 'latin', 'europe'], ['pop'], -0.3, 0.6, 60, ['Tomás Echeverría', 'Celia Ortega']],
    ['Weekly Static', 'NME', 1960, 2040, ['rock', 'electronic', 'pop'], ['country_folk'], 0, 0.7, 76, ['Kit Hargreaves', 'Wren Doyle']],
  ],
  asia: [
    ['Oto Weekly', 'Music Life', 1950, 2040, ['asia_me', 'rock', 'pop'], [], 0.4, 0.45, 62, ['Haruomi Sato', 'Akiko Ueda']],
    ['Filmi Notes', 'Filmfare', 1945, 2040, ['asia_me', 'pop'], ['rock'], 0.8, 0.25, 60, ['Kishore Rao', 'Lata Menon']],
    ['Canto Daily', 'Ming Pao (Cultura)', 1975, 2040, ['asia_me', 'pop'], [], 0.6, 0.35, 55, ['Ka-ho Leung', 'Faye Chan']],
    ['Seoul Beat', 'IZM', 1995, 2040, ['asia_me', 'pop', 'hiphop', 'rnb'], [], 0.3, 0.55, 64, ['Ji-hoon Park', 'Ha-eun Kim']],
  ],
  africa: [
    ['Highlife Times', 'Drum', 1950, 2005, ['africa', 'blues_jazz'], [], 0.4, 0.4, 58, ['Kayode Adeyemi', 'Folake Ojo']],
    ['Joburg Jive', 'Bona', 1955, 2040, ['africa', 'blues_jazz', 'sacred'], [], 0.3, 0.4, 55, ['Sipho Ndlovu', 'Thandi Mokoena']],
    ['Sahel Sound', 'Jeune Afrique (Cultura)', 1962, 2040, ['africa'], ['country_folk'], -0.2, 0.5, 60, ['Moussa Diallo', 'Awa Sow']],
    ['Afro Groove', 'OkayAfrica', 2005, 2040, ['africa', 'hiphop', 'caribbean', 'electronic'], [], 0.3, 0.45, 64, ['Tunde Bakare', 'Tiwa Adesanya']],
  ],
  oceania: [
    ['Southern Cross Sound', 'Countdown', 1960, 2010, ['rock', 'pop'], [], 0.7, 0.3, 58, ['Owen McRae', 'Piper Lawson']],
    ['Dingo Rag', 'Juice', 1980, 2040, ['rock', 'electronic', 'hiphop'], ['pop'], -0.4, 0.6, 62, ['Rex Callaghan', 'Skye Tamati']],
    ['Kiwi Kerplunk', 'Rip It Up', 1977, 2040, ['rock', 'pop', 'country_folk'], [], 0, 0.5, 56, ['Toby Ngata', 'Lorna Fitzgerald']],
  ],
};

/** Cada veículo tem dois críticos: um na primeira metade do período, outro na segunda. */
export const REGIONAL_CRITICS: RegionalCritic[] = Object.entries(REGIONS).flatMap(([region, outlets]) =>
  outlets.flatMap(([outlet, realRef, from, to, favors, dislikes, mainstream, harsh, prestige, [a, b]], i) => {
    const mid = Math.round((from + to) / 2);
    const base = { outlet, realRef, region: region as MarketId, favors, dislikes, mainstream, harsh, prestige };
    return [
      { ...base, id: `rc_${region}_${i}_a`, name: a, from, to: Math.min(to, mid + 4) },
      { ...base, id: `rc_${region}_${i}_b`, name: b, from: Math.max(from, mid - 4), to, harsh: Math.min(1, harsh + 0.1) },
    ];
  }),
);
