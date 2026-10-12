// Rodada 14 (polimento) — o primeiro passo do tutorial fala da carreira principal (sem DOM: testável).
// r27: toda carreira abre na Sede › Sua sede; o texto do passo 1 fala do ofício (empresário, músico…).

import { l, type L } from '../data/world';
import { CAREER_NAV } from './careernav13';
import './polish14.css';

const INTRO14: Record<string, [L, L]> = {
  // r27: o jogo abre na Sede › Sua sede — o passo 1 apresenta a sede e onde achar o resto (menu em árvore e Buscar)
  label: [l('Bem-vindo à sua sede', 'Welcome to your HQ'), l('Este é o seu selo visto de dentro. O menu tem 6 seções: abra uma para ver todas as páginas e abas (Ctrl+K busca qualquer uma). O Cockpit mostra o caixa e o próximo passo — o primeiro de todos é contratar um artista.', 'This is your label seen from inside. The menu has 6 sections: open one to see every page and tab (Ctrl+K finds any of them). The Cockpit shows the cash and the next step — the very first is signing an artist.')],
  manager: [l('Bem-vindo ao seu escritório de gestão', 'Welcome to your management office'), l('Na página da carreira ficam seus clientes, as comissões e os contratos que você negocia por eles. Prospecte artistas e cuide da carreira de cada um.', 'Your career page holds your clients, commissions and the deals you negotiate for them. Prospect acts and look after each career.')],
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
export function tutorialIntro14(active: string[]): { title: L; text: L; area: string; page?: string } {
  const id = active.includes('label') || !active.length ? 'label' : active.find((x) => INTRO14[x]) ?? 'label';
  const [title, text] = INTRO14[id];
  // r27: todas as carreiras começam na Sede (sua sede); a página da carreira fica a um toque, no menu
  if (id === 'label') return { title, text, area: 'sede25' };
  const page = CAREER_NAV[id]?.home.area;
  return { title, text: { pt: `Você começa na sua sede. ${text.pt}`, en: `You start at your HQ. ${text.en}` }, area: 'sede25', page };
}
