// Rodada 14 (polimento) — o primeiro passo do tutorial fala da carreira principal (sem DOM: testável).
// Só o dono de selo tem "sede"; o empresário começa pela gestão, o músico pela banda, etc.

import { l, type L } from '../data/world';
import { CAREER_NAV } from './careernav13';
import './polish14.css';

const INTRO14: Record<string, [L, L]> = {
  label: [l('Bem-vindo à sua sede', 'Welcome to your HQ'), l('Esta é a sua empresa vista de cima. Cada pessoa no piso faz algo real: gravar, compor, descansar. Clique numa banda para abrir a ficha.', 'This is your company from above. Everyone on the floor is doing something real: recording, writing, resting. Click a band to open its sheet.')],
  manager: [l('Bem-vindo ao seu escritório de gestão', 'Welcome to your management office'), l('Aqui ficam seus clientes, as comissões e os contratos que você negocia por eles. Prospecte artistas e cuide da carreira de cada um.', 'Your clients, commissions and the deals you negotiate for them live here. Prospect acts and look after each career.')],
  booking: [l('Bem-vindo à sua agência de shows', 'Welcome to your booking agency'), l('Monte turnês, feche datas com casas e festivais e ganhe sua parte de cada noite.', 'Build tours, book dates with venues and festivals and take your cut of every night.')],
  festival: [l('Bem-vindo ao seu festival', 'Welcome to your festival'), l('Escolha o line-up, o local e o preço; o público, o clima e a cena decidem se a edição dá lucro.', 'Pick the line-up, site and price; crowds, weather and the scene decide whether the edition pays.')],
  venue: [l('Bem-vindo à sua casa de shows', 'Welcome to your venue'), l('Programe as noites, escolha quem sobe ao palco e cuide da bilheteria e do bar.', 'Program the nights, choose who takes the stage and mind the door and the bar.')],
  studio: [l('Bem-vindo ao seu estúdio', 'Welcome to your studio'), l('Alugue horas, produza discos e construa uma assinatura sonora que os artistas queiram.', 'Rent hours, produce records and build a sonic signature artists want.')],
  publisher: [l('Bem-vindo à sua editora', 'Welcome to your publishing house'), l('Contrate compositores, administre o catálogo e ganhe com cada execução e regravação.', 'Sign songwriters, run the catalog and earn from every play and cover.')],
  media: [l('Bem-vindo aos seus veículos', 'Welcome to your outlets'), l('Rádio, revista ou TV: escolha o que tocar e quem promover — sua influência mexe nas paradas.', 'Radio, magazine or TV: choose what to play and whom to push — your influence moves the charts.')],
  platform: [l('Bem-vindo à sua plataforma', 'Welcome to your platform'), l('Catálogo, assinantes e algoritmo: atraia selos e artistas e ganhe escala.', 'Catalog, subscribers and algorithm: win labels and artists over and grow to scale.')],
  musician: [l('Bem-vindo à sua banda', 'Welcome to your band'), l('Esta é a sua carreira no palco: componha, grave, faça shows e cuide da banda — cada pessoa tem tempo e humor próprios.', 'This is your career on stage: write, record, play shows and look after the band — everyone has their own time and mood.')],
};

/** Primeiro passo do tutorial para as carreiras ativas (a primeira escolhida manda). */
export function tutorialIntro14(active: string[]): { title: L; text: L; area: string } {
  const id = active.includes('label') || !active.length ? 'label' : active.find((x) => INTRO14[x]) ?? 'label';
  const [title, text] = INTRO14[id];
  return { title, text, area: id === 'label' ? 'hq' : CAREER_NAV[id]?.home.area ?? 'cockpit' };
}
