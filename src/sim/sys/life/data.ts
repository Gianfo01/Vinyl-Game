// Dados do personagem do jogador (rodada 5): origens, hobbies, profissões de pretendentes.

import { l, type L } from '../../../data/world';
import type { SkillId } from '../../../data/people';
import type { Person } from '../../types';
import type { PerkValues } from '../../perks';

export type BackgroundId = 'musician' | 'heir' | 'dj' | 'lawyer' | 'producer' | 'fan' | 'street' | 'academic' | 'critic' | 'tech' | 'roadie';

export interface BackgroundDef {
  id: BackgroundId;
  name: L;
  desc: L;
  /** bônus nos atributos de dono */
  owner: Partial<Record<'ear' | 'negotiation' | 'charisma' | 'management', number>>;
  /** habilidades musicais iniciais (fração do potencial) e foco */
  musical: number;
  skills: Partial<Record<SkillId, number>>;
  wealth: number; // dólares reais
  role: Person['role'];
  traits: string[];
  /** efeitos de jogabilidade (rodada 6) */
  perks?: PerkValues;
  /** só para atos dessas famílias de gênero */
  families?: { ids: string[]; perks: PerkValues };
  /** caixa inicial extra (ou a menos) da empresa, em dólares reais */
  startCash?: number;
  effects?: L;
}

export const BACKGROUNDS: BackgroundDef[] = [
  { id: 'musician', name: l('Músico(a) de estrada', 'Road musician'), desc: l('Tocou em bares e bailes antes de abrir o selo. Sabe tocar e sabe o que um artista sente.', 'Played bars and dances before starting the label. Can play and knows how artists feel.'), owner: { ear: 6, charisma: 3 }, musical: 0.62, skills: { instr: 10, stage: 8 }, wealth: 12000, role: 'guitar', traits: ['intuitive'], perks: { trust: 6, offer: 0.04, songQ: 1 }, effects: l('Artistas confiam mais (+6) e ofertas pesam mais; +1 de qualidade nas gravações; cachê maior nos bares.', 'Artists trust you more (+6) and offers weigh more; +1 recording quality; better bar fees.') },
  { id: 'heir', name: l('Herdeiro(a) de empresário', 'Business heir'), desc: l('Cresceu entre contratos e jantares. Dinheiro e contatos, pouca estrada.', 'Grew up among contracts and dinners. Money and contacts, little road experience.'), owner: { negotiation: 6, management: 4 }, musical: 0.3, skills: { biz: 20 }, wealth: 68000, role: 'keys', traits: ['ambitious'], perks: { wealth: 250, valuation: 0.15, trust: -4 }, startCash: 15000, effects: l('+$15 mil no caixa inicial, fundo da família (+$250/mês pessoal) e investidores te valorizam 15% a mais; artistas desconfiam (−4).', '+$15k starting cash, family trust fund (+$250/month personal) and investors value you 15% more; artists are wary (−4).') },
  { id: 'dj', name: l('Radialista ou DJ', 'Radio host or DJ'), desc: l('Passou anos escolhendo o que o público ia ouvir. Ouvido afiado e voz conhecida.', 'Spent years choosing what people would hear. Sharp ear and a known voice.'), owner: { ear: 8, charisma: 4 }, musical: 0.45, skills: { prod: 14, stage: 6 }, wealth: 16000, role: 'dj', traits: ['charismatic'], perks: { appeal: 0.08, signals: 1 }, effects: l('+8% de apelo nos lançamentos (rádio é casa) e +1 sinal de scouting por mês.', '+8% release appeal (radio is home) and +1 scouting signal a month.') },
  { id: 'lawyer', name: l('Advogado(a) do meio musical', 'Music lawyer'), desc: l('Redigiu contratos para os outros; agora assina os seus. Negocia como ninguém.', 'Drafted contracts for others; now signs their own. A born negotiator.'), owner: { negotiation: 10, management: 4 }, musical: 0.2, skills: { biz: 25 }, wealth: 28000, role: 'vocal', traits: ['disciplined'], perks: { advance: -0.12, offer: 0.03 }, effects: l('Artistas aceitam adiantamentos 12% menores e suas ofertas soam mais seguras.', 'Artists accept 12% smaller advances and your offers sound safer.') },
  { id: 'producer', name: l('Produtor(a) de estúdio', 'Studio producer'), desc: l('Viveu atrás da mesa de som. Sabe transformar uma demo num disco.', 'Lived behind the mixing desk. Knows how to turn a demo into a record.'), owner: { ear: 6, management: 2 }, musical: 0.55, skills: { prod: 18, comp: 6 }, wealth: 15000, role: 'producer', traits: ['perfectionist'], perks: { songQ: 2, critics: 0.2 }, effects: l('+2 de qualidade nas gravações e a crítica ouve com mais atenção.', '+2 recording quality and critics listen more closely.') },
  { id: 'fan', name: l('Fã que virou empresário(a)', 'Fan turned executive'), desc: l('Colecionava discos, ia a todos os shows e um dia resolveu lançar os próprios.', 'Collected records, went to every show and one day decided to release their own.'), owner: { charisma: 6, ear: 3 }, musical: 0.4, skills: { lyr: 8, stage: 4 }, wealth: 14000, role: 'vocal', traits: ['generous'], perks: { signals: 1, trust: 3, morale: 0.5 }, effects: l('+1 sinal por mês (você está em todo show), +3 de confiança e elenco mais animado.', '+1 signal a month (you go to every show), +3 trust and a happier roster.') },
  { id: 'street', name: l('Cria da periferia', 'Street kid'), desc: l('Cresceu nos bailes, rodas e sound systems do bairro. Sem dinheiro, com toda a credibilidade.', 'Grew up in block parties, circles and sound systems. No money, all the credibility.'), owner: { ear: 5, charisma: 5 }, musical: 0.5, skills: { lyr: 10, stage: 6 }, wealth: 3000, role: 'mc', traits: ['street'], perks: { scoutActions: 1 }, families: { ids: ['hiphop', 'caribbean', 'brazil', 'latin', 'africa', 'rnb'], perks: { offer: 0.07, appeal: 0.06, trust: 6 } }, startCash: -1500, effects: l('Pouco dinheiro (−$1,5 mil no caixa), mas +1 ação de scouting e muita credibilidade com hip hop, reggae, latinos, África, Brasil e R&B (ofertas, apelo e confiança).', 'Little money (−$1.5k cash) but +1 scouting action and strong credibility with hip hop, reggae, Latin, African, Brazilian and R&B acts (offers, appeal, trust).') },
  { id: 'academic', name: l('Maestro de conservatório', 'Conservatory conductor'), desc: l('Partitura, regência e rigor. A crítica te respeita; o pop te acha careta.', 'Scores, conducting and rigour. Critics respect you; pop finds you square.'), owner: { ear: 8, management: 3 }, musical: 0.65, skills: { comp: 12, instr: 8 }, wealth: 20000, role: 'strings', traits: ['virtuoso'], perks: { critics: 0.4 }, families: { ids: ['sacred', 'blues_jazz', 'europe'], perks: { songQ: 2, offer: 0.05 } }, effects: l('Crítica +0,4 em toda nota; +2 de qualidade e ofertas melhores em clássico, jazz e música europeia.', 'Critics +0.4 on every score; +2 quality and better offers in classical, jazz and European music.') },
  { id: 'critic', name: l('Crítico musical', 'Music critic'), desc: l('Escreveu resenhas por anos. Conhece todo mundo e todo mundo te conhece (e alguns te odeiam).', 'Wrote reviews for years. Knows everyone and everyone knows you (some hate you).'), owner: { ear: 7, charisma: 2 }, musical: 0.3, skills: { lyr: 12 }, wealth: 18000, role: 'vocal', traits: ['intellectual'], perks: { critics: 0.5, scoutAccuracy: 0.1, trust: -3 }, effects: l('Críticas +0,5 e relatórios de scouting 10% mais precisos; artistas lembram das suas resenhas (−3 de confiança).', 'Reviews +0.5 and scouting reports 10% more precise; artists remember your reviews (−3 trust).') },
  { id: 'tech', name: l('Engenheiro de tecnologia', 'Tech engineer'), desc: l('Montou transmissores, fábricas e depois servidores. Sabe para onde a tecnologia vai.', 'Built transmitters, plants and later servers. Knows where technology is going.'), owner: { management: 6, ear: 2 }, musical: 0.35, skills: { prod: 16 }, wealth: 30000, role: 'producer', traits: ['dreamer'], perks: { chartUnits: 0.06, pressingCost: -0.08 }, effects: l('+6% de vendas e −8% no custo de fabricação.', '+6% sales and −8% manufacturing cost.') },
  { id: 'roadie', name: l('Ex-produtor de turnê', 'Former tour manager'), desc: l('Rodou o mundo montando palcos. Conhece casas, promotores e estradas.', 'Toured the world building stages. Knows venues, promoters and roads.'), owner: { management: 5, negotiation: 3 }, musical: 0.4, skills: { stage: 10, instr: 4 }, wealth: 12000, role: 'drums', traits: ['party'], perks: { showRevenue: 0.1, energy: 1 }, effects: l('+10% de bilheteria e +1 tempo livre por mês (você aguenta estrada).', '+10% box office and +1 free time a month (you can take the road).') },
];

export const backgroundById = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b])) as Record<BackgroundId, BackgroundDef>;

export const JOBS: L[] = [
  l('professora', 'teacher'), l('fotógrafo', 'photographer'), l('jornalista', 'journalist'), l('médica', 'doctor'), l('arquiteto', 'architect'), l('atriz', 'actress'),
  l('dançarino', 'dancer'), l('estilista', 'fashion designer'), l('chef de cozinha', 'chef'), l('advogada', 'lawyer'), l('pintor', 'painter'), l('piloto', 'pilot'),
  l('escritora', 'writer'), l('engenheiro de som', 'sound engineer'), l('modelo', 'model'), l('veterinária', 'vet'), l('produtor de TV', 'TV producer'), l('cantora de coral', 'choir singer'),
];

export const PARTNER_TRAITS: { id: string; name: L; likes: 'family' | 'fame' | 'money' | 'music' | 'calm' }[] = [
  { id: 'homebody', name: l('caseiro(a)', 'homebody'), likes: 'family' },
  { id: 'glam', name: l('adora holofotes', 'loves the spotlight'), likes: 'fame' },
  { id: 'practical', name: l('pé no chão', 'down to earth'), likes: 'money' },
  { id: 'artsy', name: l('alma de artista', 'artist at heart'), likes: 'music' },
  { id: 'zen', name: l('tranquilo(a)', 'easygoing'), likes: 'calm' },
];

export type HobbyId = 'records' | 'golf' | 'painting' | 'cars' | 'cooking' | 'sport';
export const HOBBIES: { id: HobbyId; name: L; desc: L; cost: number }[] = [
  { id: 'records', name: l('Colecionar discos', 'Collect records'), desc: l('Treina o ouvido (atributo Ouvido).', 'Trains your ear (Ear attribute).'), cost: 200 },
  { id: 'golf', name: l('Golfe com executivos', 'Golf with executives'), desc: l('Treina a negociação e abre portas.', 'Trains negotiation and opens doors.'), cost: 600 },
  { id: 'painting', name: l('Pintura', 'Painting'), desc: l('Alivia o estresse e solta a criatividade.', 'Relieves stress and frees creativity.'), cost: 150 },
  { id: 'cars', name: l('Carros antigos', 'Classic cars'), desc: l('Caro; dá status e alivia o estresse.', 'Expensive; brings status and relieves stress.'), cost: 2500 },
  { id: 'cooking', name: l('Cozinhar para os amigos', 'Cooking for friends'), desc: l('Saúde, estresse e carisma.', 'Health, stress and charisma.'), cost: 120 },
  { id: 'sport', name: l('Esporte (corrida, futebol, natação)', 'Sport (running, football, swimming)'), desc: l('Saúde e resistência; menos estresse.', 'Health and stamina; less stress.'), cost: 80 },
];

export type KidEdu = 'public' | 'music' | 'elite';
export const KID_EDU: Record<KidEdu, { name: L; monthly: number; apt: number }> = {
  public: { name: l('Escola comum', 'Regular school'), monthly: 0, apt: 0.05 },
  music: { name: l('Conservatório infantil', 'Children\'s conservatory'), monthly: 150, apt: 0.45 },
  elite: { name: l('Internato de elite + aulas particulares', 'Elite boarding school + private tutors'), monthly: 700, apt: 0.6 },
};
