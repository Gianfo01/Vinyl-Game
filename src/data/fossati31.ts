// R31 · onda 3 (Z) — HOMENAGEM À FAMÍLIA FOSSATI (plano-pagina.md, "Homenagem à família Fossati"). Ficção declarada:
// Efro, Lucia, Sonia e Antonella Fossati, de Cantù (norte da Itália), existem em TODA partida, na cidade deles, em
// qualquer ano de início — sem "chegada" — e nunca envelhecem nem morrem; a única mudança de vida é a Sonia se aposentar
// como empresária no fim. Gianluca entra na árvore da família como pessoa do jogo, sem homenagem.
//
// Identidade é DADO (constante): nome, idade aparente fixa, origem. O que muda com a época é o PAPEL, e papel mora num
// lugar só (sim/r31/role.ts, chave de ficha 'fam:<id>'): `FAM_ERAS31` diz qual papel vale em cada ano e o motor
// (sim/sys/fossati31.ts) abre/fecha os papéis na virada do ano. A família aparece sempre com o nome real, mesmo com
// "Nomes e obras reais" desligado; as marcas ligadas a ela (rádios, artistas agenciados) seguem o interruptor
// (`brand` → registro em realnames31).
import { l, type L } from './world';
import type { RoleKind } from '../sim/r31/role';

export type FamId31 = 'efro' | 'lucia' | 'sonia' | 'antonella' | 'gianluca';
export interface FamMember31 {
  id: FamId31;
  name: string;
  /** idade aparente — fixa em qualquer ano */
  age: number;
  /** homenagem (os quatro); Gianluca é só pessoa da família */
  homage: boolean;
  /** parentesco, para a árvore */
  kin: L;
  bio: L;
}

export const FAM_ORIGIN31 = 'Cantù';
/** cidade do jogo onde a família vive: vazio = a cidade de início do jogador (a casa fica no "Nosso mundo" dele;
 *  pedido do dono, onda 4). O editor de base pode fixar uma cidade. */
export const FAM_CITY31 = { id: '' };

export const FAMILY31: FamMember31[] = [
  { id: 'efro', name: 'Efro Fossati', age: 74, homage: true, kin: l('patriarca, marido de Lucia', 'patriarch, Lucia\'s husband'),
    bio: l('Engenheiro mecânico de Cantù, dono da Metalmac, violinista, piloto do aeroclube e tenista.', 'Mechanical engineer from Cantù, owner of Metalmac, violinist, aeroclub pilot and tennis player.') },
  { id: 'lucia', name: 'Lucia Fossati', age: 72, homage: true, kin: l('matriarca, mulher de Efro', 'matriarch, Efro\'s wife'),
    bio: l('Dona de casa e o coração da família: é ela quem reúne todo mundo no almoço de domingo.', 'Homemaker and the heart of the family: she brings everyone together for Sunday lunch.') },
  { id: 'sonia', name: 'Sonia Fossati', age: 50, homage: true, kin: l('filha de Efro e Lucia', 'daughter of Efro and Lucia'),
    bio: l('Fez carreira em promoções e eventos de rádio e virou empresária de artistas.', 'Built a career in radio promotions and events and became an artist manager.') },
  { id: 'antonella', name: 'Antonella Fossati', age: 47, homage: true, kin: l('filha de Efro e Lucia', 'daughter of Efro and Lucia'),
    bio: l('Produtora de teatro e jornalista; depois abriu uma escola de idiomas.', 'Theatre producer and journalist; later opened a language school.') },
  { id: 'gianluca', name: 'Gianluca Fossati', age: 30, homage: false, kin: l('neto de Efro e Lucia', 'grandson of Efro and Lucia'),
    bio: l('Da família Fossati; fundador da Arara.', 'Of the Fossati family; founder of Arara.') },
];
export const famKey31 = (id: FamId31): string => `fam:${id}`;
export const famById31 = (id: string): FamMember31 | undefined => FAMILY31.find((m) => m.id === id || famKey31(m.id) === id);

/** Um papel da família numa faixa de anos. `org` é o id estável (o que vai no Role); `label` é o que se lê na ficha;
 *  `brand` = id do registro de nomes reais (a marca real segue o interruptor). Faixa aberta: sem `to`. */
export interface FamEra31 { from: number; to?: number; kind: RoleKind; org: string; label: L; brand?: string }
/** Ano-base dos papéis "de sempre" (antes de qualquer início de partida, 1889): a família não "chega". */
export const FAM_SINCE31 = 1880;
/** Sonia se aposenta como empresária neste ano (a única mudança de vida). */
export const SONIA_RETIRE31 = 2036;

export const FAM_ERAS31: Record<FamId31, FamEra31[]> = {
  efro: [
    { from: FAM_SINCE31, kind: 'family', org: 'fossati', label: l('Família Fossati', 'Fossati family') },
    { from: FAM_SINCE31, to: 1900, kind: 'owner', org: 'metalmac', label: l('Metalmac — moldes de cilindro e peças de fonógrafo', 'Metalmac — cylinder moulds and phonograph parts') },
    { from: 1901, to: 1947, kind: 'owner', org: 'metalmac', label: l('Metalmac — prensas de discos de 78 rotações', 'Metalmac — 78 rpm record presses') },
    { from: 1948, to: 1981, kind: 'owner', org: 'metalmac', label: l('Metalmac — prensas de LP e compacto', 'Metalmac — LP and single presses') },
    { from: 1982, to: 2007, kind: 'owner', org: 'metalmac', label: l('Metalmac — linhas de CD', 'Metalmac — CD lines') },
    { from: 2008, kind: 'owner', org: 'metalmac', label: l('Metalmac — prensas de vinil da volta do LP', 'Metalmac — vinyl presses for the LP revival') },
  ],
  lucia: [
    { from: FAM_SINCE31, kind: 'family', org: 'fossati', label: l('Família Fossati — dona de casa', 'Fossati family — homemaker') },
  ],
  sonia: [
    { from: FAM_SINCE31, kind: 'family', org: 'fossati', label: l('Família Fossati', 'Fossati family') },
    { from: FAM_SINCE31, to: 1921, kind: 'media', org: 'salao_jornal', label: l('Promoções em salão de eventos e no jornal', 'Promotions at the events hall and in the newspaper') },
    { from: 1922, to: 1999, kind: 'media', org: 'radio', label: l('Diretora de promoções da rádio principal da cidade', 'Promotions director at the city\'s main radio station') },
    { from: 2000, to: 2005, kind: 'media', org: '89fm', label: l('Diretora de promoções e eventos da 89 FM', 'Promotions and events director at 89 FM'), brand: 'cur:radio_89fm' },
    { from: 2006, to: 2011, kind: 'media', org: 'virgin', label: l('Diretora de promoções e eventos da Rádio Virgin', 'Promotions and events director at Virgin Radio'), brand: 'cur:radio_virgin' },
    { from: 2012, to: 2020, kind: 'media', org: 'gazeta_fm', label: l('Diretora de promoções e eventos da Gazeta FM', 'Promotions and events director at Gazeta FM'), brand: 'cur:radio_gazeta' },
    { from: 2021, to: SONIA_RETIRE31 - 1, kind: 'manager', org: 'sonia_mgmt', label: l('Empresária de artistas (agencia Milton Guedes)', 'Artist manager (manages Milton Guedes)'), brand: 'cur:milton_guedes' },
  ],
  antonella: [
    { from: FAM_SINCE31, kind: 'family', org: 'fossati', label: l('Família Fossati', 'Fossati family') },
    { from: FAM_SINCE31, to: 1996, kind: 'producer', org: 'teatro', label: l('Produtora de teatro', 'Theatre producer') },
    { from: FAM_SINCE31, to: 1996, kind: 'media', org: 'jornal', label: l('Jornalista', 'Journalist') },
    { from: 1997, kind: 'owner', org: 'escola_idiomas', label: l('Dona de uma escola de idiomas', 'Owner of a language school') },
  ],
  gianluca: [
    { from: FAM_SINCE31, kind: 'family', org: 'fossati', label: l('Família Fossati', 'Fossati family') },
  ],
};

/** Era vigente de um papel no ano (o mais recente que começou até o ano e não terminou). */
export const famErasAt31 = (id: FamId31, y: number): FamEra31[] => FAM_ERAS31[id].filter((e) => e.from <= y && (e.to === undefined || e.to >= y));
