// Dados do personagem do jogador (rodada 5): origens, hobbies, profissões de pretendentes.

import { l, type L } from '../../../data/world';
import type { SkillId } from '../../../data/people';
import type { Person } from '../../types';

export type BackgroundId = 'musician' | 'heir' | 'dj' | 'lawyer' | 'producer' | 'fan';

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
}

export const BACKGROUNDS: BackgroundDef[] = [
  { id: 'musician', name: l('Músico(a) de estrada', 'Road musician'), desc: l('Tocou em bares e bailes antes de abrir o selo. Sabe tocar e sabe o que um artista sente.', 'Played bars and dances before starting the label. Can play and knows how artists feel.'), owner: { ear: 6, charisma: 3 }, musical: 0.62, skills: { instr: 10, stage: 8 }, wealth: 12000, role: 'guitar', traits: ['intuitive'] },
  { id: 'heir', name: l('Herdeiro(a) de empresário', 'Business heir'), desc: l('Cresceu entre contratos e jantares. Dinheiro e contatos, pouca estrada.', 'Grew up among contracts and dinners. Money and contacts, little road experience.'), owner: { negotiation: 6, management: 4 }, musical: 0.3, skills: { biz: 20 }, wealth: 68000, role: 'keys', traits: ['ambitious'] },
  { id: 'dj', name: l('Radialista ou DJ', 'Radio host or DJ'), desc: l('Passou anos escolhendo o que o público ia ouvir. Ouvido afiado e voz conhecida.', 'Spent years choosing what people would hear. Sharp ear and a known voice.'), owner: { ear: 8, charisma: 4 }, musical: 0.45, skills: { prod: 14, stage: 6 }, wealth: 16000, role: 'dj', traits: ['charismatic'] },
  { id: 'lawyer', name: l('Advogado(a) do meio musical', 'Music lawyer'), desc: l('Redigiu contratos para os outros; agora assina os seus. Negocia como ninguém.', 'Drafted contracts for others; now signs their own. A born negotiator.'), owner: { negotiation: 10, management: 4 }, musical: 0.2, skills: { biz: 25 }, wealth: 28000, role: 'vocal', traits: ['disciplined'] },
  { id: 'producer', name: l('Produtor(a) de estúdio', 'Studio producer'), desc: l('Viveu atrás da mesa de som. Sabe transformar uma demo num disco.', 'Lived behind the mixing desk. Knows how to turn a demo into a record.'), owner: { ear: 6, management: 2 }, musical: 0.55, skills: { prod: 18, comp: 6 }, wealth: 15000, role: 'producer', traits: ['perfectionist'] },
  { id: 'fan', name: l('Fã que virou empresário(a)', 'Fan turned executive'), desc: l('Colecionava discos, ia a todos os shows e um dia resolveu lançar os próprios.', 'Collected records, went to every show and one day decided to release their own.'), owner: { charisma: 6, ear: 3 }, musical: 0.4, skills: { lyr: 8, stage: 4 }, wealth: 14000, role: 'vocal', traits: ['generous'] },
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
