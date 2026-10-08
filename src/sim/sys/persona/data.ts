// Dados da persona do jogador (rodada 6): traços escolhíveis, estilos de vida com árvore de perks
// (inspirados nos Lifestyles do Crusader Kings III), visuais e efeitos de jogabilidade das origens.

import { l, type L } from '../../../data/world';
import type { SkillId } from '../../../data/people';
import type { PerkValues } from '../../perks';

export type OwnerAttrId = 'ear' | 'negotiation' | 'charisma' | 'management';

export interface PlayerTraitDef {
  id: string;
  name: L;
  desc: L;
  /** traço oposto (não podem ser escolhidos juntos) */
  opposite?: string;
  attrs?: Partial<Record<OwnerAttrId, number>>;
  skills?: Partial<Record<SkillId, number>>;
  perks?: PerkValues;
  /** traço que vai para a pessoa do jogador (temperamento puxa gênero da própria banda) */
  personTrait?: string;
  /** perks extras só para atos de certas famílias de gênero */
  families?: { ids: string[]; perks: PerkValues };
  /** congênito: herdável pelos filhos */
  congenital?: boolean;
}

export const PLAYER_TRAITS: PlayerTraitDef[] = [
  { id: 'charismatic', name: l('Carismático', 'Charismatic'), desc: l('Encanta salas, imprensa e artistas.', 'Charms rooms, press and artists.'), opposite: 'shy', attrs: { charisma: 12 }, skills: { stage: 6 }, perks: { offer: 0.03, trust: 3 }, personTrait: 'charismatic' },
  { id: 'shy', name: l('Tímido', 'Shy'), desc: l('Prefere a mesa de som ao palco; escuta mais do que fala.', 'Prefers the desk to the stage; listens more than talks.'), opposite: 'charismatic', attrs: { charisma: -8, ear: 6 }, perks: { scoutAccuracy: 0.06, stress: 0.05 }, personTrait: 'shy' },
  { id: 'honest', name: l('Honesto', 'Honest'), desc: l('Palavra vale contrato. Artistas confiam; tramas pesam na consciência.', 'Your word is a contract. Artists trust you; schemes weigh on you.'), opposite: 'schemer', perks: { trust: 6, critics: 0.15, scheme: -0.15 } },
  { id: 'schemer', name: l('Ardiloso', 'Scheming'), desc: l('Sabe onde apertar e quando mentir. Tramas rendem mais; confiança, menos.', 'Knows where to press and when to lie. Schemes pay off; trust suffers.'), opposite: 'honest', attrs: { negotiation: 6 }, perks: { trust: -4, advance: -0.05, scheme: 0.15 }, personTrait: 'manipulative' },
  { id: 'generous', name: l('Generoso', 'Generous'), desc: l('Divide o bolo. Elenco feliz, margens menores.', 'Shares the pie. Happy roster, thinner margins.'), opposite: 'greedy', perks: { morale: 0.8, trust: 5, staffCost: 0.04 }, personTrait: 'generous' },
  { id: 'greedy', name: l('Ganancioso', 'Greedy'), desc: l('Cada centavo conta. Negocia duro e investidores adoram.', 'Every cent counts. Negotiates hard; investors love it.'), opposite: 'generous', attrs: { negotiation: 8 }, perks: { advance: -0.08, valuation: 0.08, trust: -5, morale: -0.4 } },
  { id: 'calm', name: l('Sereno', 'Calm'), desc: l('Crises passam por você como brisa.', 'Crises pass over you like a breeze.'), opposite: 'workaholic', attrs: { management: 4 }, perks: { stress: -0.3 }, personTrait: 'resilient' },
  { id: 'workaholic', name: l('Workaholic', 'Workaholic'), desc: l('Mais horas por mês, mais estresse e menos família.', 'More hours a month, more stress and less family.'), opposite: 'calm', attrs: { management: 6 }, perks: { energy: 1, stress: 0.3, xp: 0.1 }, personTrait: 'workaholic' },
  { id: 'visionary', name: l('Visionário', 'Visionary'), desc: l('Ouve o futuro antes dos outros.', 'Hears the future before anyone else.'), attrs: { ear: 8 }, perks: { signals: 1, scoutAccuracy: 0.05 }, personTrait: 'experimental' },
  { id: 'perfectionist', name: l('Perfeccionista', 'Perfectionist'), desc: l('Nada sai do estúdio sem estar certo.', 'Nothing leaves the studio until it is right.'), attrs: { ear: 4 }, perks: { songQ: 1.5, stress: 0.15 }, personTrait: 'perfectionist' },
  { id: 'bohemian', name: l('Boêmio', 'Bohemian'), desc: l('A noite é escritório. Contatos e inspiração; saúde e foco sofrem.', 'The night is your office. Contacts and inspiration; health and focus suffer.'), opposite: 'disciplined', attrs: { charisma: 6, management: -4 }, skills: { comp: 4, stage: 4 }, perks: { signals: 1, trust: 2, stress: -0.1 }, personTrait: 'party' },
  { id: 'disciplined', name: l('Disciplinado', 'Disciplined'), desc: l('Agenda, método e prazos. Aprende rápido.', 'Schedules, method and deadlines. Learns fast.'), opposite: 'bohemian', attrs: { management: 8 }, perks: { xp: 0.2, staffCost: -0.04 }, personTrait: 'disciplined' },
  { id: 'rebel', name: l('Rebelde', 'Rebel'), desc: l('Contra o sistema, a favor do barulho. Rock e hip hop te adoram; o establishment, não.', 'Against the system, for the noise. Rock and hip hop love you; the establishment does not.'), opposite: 'traditional', attrs: { charisma: 3 }, perks: { reputation: -1 }, personTrait: 'rebel', families: { ids: ['rock', 'hiphop', 'caribbean'], perks: { appeal: 0.06, offer: 0.05 } } },
  { id: 'traditional', name: l('Tradicionalista', 'Traditionalist'), desc: l('Respeita a raiz, o acetato e o aperto de mão. Catálogo e físico rendem mais.', 'Respects roots, lacquer and handshakes. Catalog and physical sell better.'), opposite: 'rebel', attrs: { management: 3 }, perks: { pressingCost: -0.08, reputation: 1 }, personTrait: 'rooted', families: { ids: ['country_folk', 'blues_jazz', 'sacred', 'brazil'], perks: { appeal: 0.05, offer: 0.04 } } },
  { id: 'romantic', name: l('Romântico', 'Romantic'), desc: l('Vive de paixões. Encontros rendem mais; baladas também.', 'Lives for passion. Dates go better; so do ballads.'), attrs: { charisma: 3 }, skills: { lyr: 6 }, personTrait: 'romantic', families: { ids: ['latin', 'pop', 'rnb', 'brazil'], perks: { appeal: 0.04 } } },
  { id: 'spiritual', name: l('Espiritual', 'Spiritual'), desc: l('Fé ou meditação: menos estresse e um pé no sagrado.', 'Faith or meditation: less stress and a foot in the sacred.'), perks: { stress: -0.15 }, personTrait: 'spiritual', families: { ids: ['sacred', 'caribbean', 'africa'], perks: { appeal: 0.05 } } },
  { id: 'intellectual', name: l('Intelectual', 'Intellectual'), desc: l('Lê tudo, cita tudo. A crítica respeita.', 'Reads everything, quotes everything. Critics respect you.'), attrs: { ear: 3 }, skills: { lyr: 4 }, perks: { critics: 0.3 }, personTrait: 'intellectual', families: { ids: ['blues_jazz', 'europe', 'sacred'], perks: { offer: 0.04 } } },
  { id: 'ambitious', name: l('Ambicioso', 'Ambitious'), desc: l('Quer o topo e não esconde. Aprende e cresce rápido, cansa mais.', 'Wants the top and shows it. Learns and grows fast, tires more.'), perks: { xp: 0.15, stress: 0.1, offer: 0.02, valuation: 0.05 }, personTrait: 'ambitious' },
  { id: 'frugal', name: l('Frugal', 'Frugal'), desc: l('Vive com pouco: o patrimônio pessoal rende mais.', 'Lives on little: personal wealth stretches further.'), perks: { wealth: 90, staffCost: -0.03 }, personTrait: 'frugal' },
  { id: 'perfect_pitch', name: l('Ouvido absoluto', 'Perfect pitch'), desc: l('Dom raro e hereditário: escuta uma nota fora a dez metros.', 'A rare, inheritable gift: hears a wrong note from ten metres.'), attrs: { ear: 10 }, skills: { instr: 4, voice: 4 }, perks: { songQ: 1 }, congenital: true, personTrait: 'virtuoso' },
];

export const playerTraitById = Object.fromEntries(PLAYER_TRAITS.map((x) => [x.id, x])) as Record<string, PlayerTraitDef>;
export const MAX_PLAYER_TRAITS = 3;

// ---------------------------------------------------------------- estilos de vida (árvore de perks)

export type StyleId = 'mentor' | 'mogul' | 'hitmaker' | 'curator' | 'showman' | 'schemer';

export interface StylePerk { name: L; desc: L; values: PerkValues }
export interface StyleDef { id: StyleId; name: L; desc: L; icon: string; attrs: Partial<Record<OwnerAttrId, number>>; perks: StylePerk[] }

const sp = (pt: string, en: string, dpt: string, den: string, values: PerkValues): StylePerk => ({ name: l(pt, en), desc: l(dpt, den), values });

export const STYLES: StyleDef[] = [
  { id: 'mentor', name: l('Mentor', 'Mentor'), icon: 'heart', desc: l('Seu jogo é gente: formar artistas, cuidar do elenco, criar lealdade.', 'Your game is people: develop artists, care for the roster, build loyalty.'), attrs: { charisma: 4, management: 2 }, perks: [
    sp('Porta aberta', 'Open door', '+5 de confiança ao assinar.', '+5 trust when signing.', { trust: 5 }),
    sp('Ombro amigo', 'Shoulder to lean on', '+1 de moral por mês no elenco.', '+1 morale a month across the roster.', { morale: 1 }),
    sp('Fama de bom patrão', 'Good-boss reputation', 'Ofertas mais atraentes.', 'More attractive offers.', { offer: 0.04 }),
    sp('Lapidador', 'Polisher', '+1 de qualidade nas músicas do elenco.', '+1 quality on roster songs.', { songQ: 1 }),
    sp('Família musical', 'Musical family', '+5 confiança e moral extra.', '+5 trust and extra morale.', { trust: 5, morale: 0.5 }),
    sp('Casa de mestres', 'House of masters', 'Mais qualidade e respeito da crítica.', 'More quality and critics\' respect.', { songQ: 1.5, critics: 0.2 }),
  ] },
  { id: 'mogul', name: l('Magnata', 'Mogul'), icon: 'bank', desc: l('Números, escala e capital. Custos baixos, valor de mercado alto.', 'Numbers, scale and capital. Low costs, high market value.'), attrs: { negotiation: 4, management: 3 }, perks: [
    sp('Planilha afiada', 'Sharp spreadsheet', '−5% em salários.', '−5% on salaries.', { staffCost: -0.05 }),
    sp('Conversa de investidor', 'Investor talk', '+10% no valor da empresa.', '+10% company valuation.', { valuation: 0.1 }),
    sp('Mesa de negociação', 'Negotiating table', 'Artistas aceitam adiantamentos 6% menores.', 'Artists accept 6% smaller advances.', { advance: -0.06 }),
    sp('Dividendos', 'Dividends', '+$150/mês de renda pessoal.', '+$150/month personal income.', { wealth: 150 }),
    sp('Escala industrial', 'Industrial scale', '−8% na fabricação.', '−8% manufacturing.', { pressingCost: -0.08 }),
    sp('Império', 'Empire', 'Mais vendas e valor de mercado.', 'More sales and market value.', { chartUnits: 0.05, valuation: 0.15 }),
  ] },
  { id: 'hitmaker', name: l('Fazedor de hits', 'Hitmaker'), icon: 'chart-up', desc: l('Refrão, rádio e parada. Você sabe o que gruda.', 'Chorus, radio and charts. You know what sticks.'), attrs: { ear: 5, charisma: 2 }, perks: [
    sp('Ouvido de rádio', 'Radio ear', '+4% de apelo.', '+4% appeal.', { appeal: 0.04 }),
    sp('Lista de contatos', 'Contact list', '+4% de vendas.', '+4% sales.', { chartUnits: 0.04 }),
    sp('Gancho certo', 'The right hook', '+1 de qualidade.', '+1 quality.', { songQ: 1 }),
    sp('Lançamento cirúrgico', 'Surgical release', '+4% de apelo.', '+4% appeal.', { appeal: 0.04 }),
    sp('Single no palco', 'Single on stage', '+5% de bilheteria.', '+5% box office.', { showRevenue: 0.05 }),
    sp('Toque de Midas', 'Midas touch', '+6% de apelo e vendas.', '+6% appeal and sales.', { appeal: 0.06, chartUnits: 0.03 }),
  ] },
  { id: 'curator', name: l('Garimpeiro', 'Curator'), icon: 'key', desc: l('Descobrir antes de todo mundo. Scouting, faro e cenas.', 'Find them before anyone else. Scouting, flair and scenes.'), attrs: { ear: 6 }, perks: [
    sp('Caderninho', 'Little black book', '+1 ação de scouting por mês.', '+1 scouting action a month.', { scoutActions: 1 }),
    sp('Olho clínico', 'Clinical eye', 'Relatórios 8% mais precisos.', 'Reports 8% more precise.', { scoutAccuracy: 0.08 }),
    sp('Rede de bares', 'Club network', '+1 sinal novo por mês.', '+1 new signal a month.', { signals: 1 }),
    sp('Primeiro a chegar', 'First to arrive', 'Ofertas mais atraentes.', 'More attractive offers.', { offer: 0.03 }),
    sp('Exército de olheiros', 'Scout army', '+1 ação de scouting.', '+1 scouting action.', { scoutActions: 1 }),
    sp('Faro lendário', 'Legendary flair', 'Precisão máxima e respeito da crítica.', 'Top precision and critics\' respect.', { scoutAccuracy: 0.12, critics: 0.2 }),
  ] },
  { id: 'showman', name: l('Showman', 'Showman'), icon: 'mic', desc: l('Palco, turnê e espetáculo. A música é ao vivo.', 'Stage, touring and spectacle. Music is live.'), attrs: { charisma: 6 }, perks: [
    sp('Casa cheia', 'Full house', '+5% de bilheteria.', '+5% box office.', { showRevenue: 0.05 }),
    sp('Fogos e luzes', 'Lights and fireworks', '+3% de apelo.', '+3% appeal.', { appeal: 0.03 }),
    sp('Pique de estrada', 'Road stamina', '+1 tempo livre por mês.', '+1 free time a month.', { energy: 1 }),
    sp('Rei dos festivais', 'Festival king', '+6% de bilheteria.', '+6% box office.', { showRevenue: 0.06 }),
    sp('Lenda ao vivo', 'Live legend', 'A crítica elogia o palco.', 'Critics praise the stage.', { critics: 0.1, trust: 2 }),
    sp('O maior espetáculo', 'The greatest show', '+10% de bilheteria e confiança.', '+10% box office and trust.', { showRevenue: 0.1, trust: 3 }),
  ] },
  { id: 'schemer', name: l('Intrigante', 'Schemer'), icon: 'camera', desc: l('Informação é poder. Segredos, tramas e negociação dura.', 'Information is power. Secrets, schemes and hard bargaining.'), attrs: { negotiation: 5 }, perks: [
    sp('Ouvidos nas paredes', 'Ears in the walls', 'Tramas +10% de sucesso.', 'Schemes +10% success.', { scheme: 0.1 }),
    sp('Letra miúda', 'Fine print', 'Adiantamentos 5% menores.', 'Advances 5% smaller.', { advance: -0.05 }),
    sp('Dossiê', 'Dossier', 'Relatórios 5% mais precisos.', 'Reports 5% more precise.', { scoutAccuracy: 0.05 }),
    sp('Cartas na manga', 'Cards up the sleeve', 'Tramas +10% de sucesso.', 'Schemes +10% success.', { scheme: 0.1 }),
    sp('Sangue frio', 'Cold blood', '−10% de estresse.', '−10% stress.', { stress: -0.1 }),
    sp('Mestre das sombras', 'Shadow master', 'Tramas +15% e ofertas melhores.', 'Schemes +15% and better offers.', { scheme: 0.15, offer: 0.03 }),
  ] },
];

export const styleById = Object.fromEntries(STYLES.map((x) => [x.id, x])) as Record<StyleId, StyleDef>;

/** XP para o perk de índice i (0..5). */
export const perkCost = (i: number): number => 400 + i * 150;

// ---------------------------------------------------------------- visual

export interface VisualDef { id: string; name: L; desc: L; attrs?: Partial<Record<OwnerAttrId, number>>; families?: string[] }
export const VISUALS: VisualDef[] = [
  { id: 'classic', name: l('Clássico (terno e gravata)', 'Classic (suit and tie)'), desc: l('Bancos e rádios confiam.', 'Banks and radio trust you.'), attrs: { negotiation: 3 } },
  { id: 'rocker', name: l('Roqueiro (couro e jeans)', 'Rocker (leather and denim)'), desc: l('A cena do rock te reconhece.', 'The rock scene recognises you.'), families: ['rock'] },
  { id: 'hippie', name: l('Hippie / boêmio', 'Hippie / boho'), desc: l('Folk, psicodelia e paz.', 'Folk, psychedelia and peace.'), families: ['country_folk', 'rock'] },
  { id: 'street', name: l('Streetwear', 'Streetwear'), desc: l('Hip hop e cultura de rua.', 'Hip hop and street culture.'), families: ['hiphop', 'caribbean'] },
  { id: 'glam', name: l('Glamour (brilho e plumas)', 'Glam (sparkle and feathers)'), desc: l('Pop, disco e holofote.', 'Pop, disco and spotlight.'), attrs: { charisma: 3 }, families: ['pop', 'rnb'] },
  { id: 'avant', name: l('Vanguarda (preto minimalista)', 'Avant-garde (minimal black)'), desc: l('Eletrônica, jazz e crítica.', 'Electronic, jazz and critics.'), families: ['electronic', 'blues_jazz'] },
  { id: 'casual', name: l('Casual', 'Casual'), desc: l('Sem pose; ninguém estranha.', 'No pose; nobody minds.') },
];
export const visualById = Object.fromEntries(VISUALS.map((x) => [x.id, x])) as Record<string, VisualDef>;

export type Pronoun = 'he' | 'she' | 'they';
export const PRONOUNS: { id: Pronoun; name: L }[] = [
  { id: 'he', name: l('ele/dele', 'he/him') },
  { id: 'she', name: l('ela/dela', 'she/her') },
  { id: 'they', name: l('elu/delu', 'they/them') },
];

/** Pontos livres para distribuir entre os atributos de dono na criação. */
export const FREE_POINTS = 8;
