// Onboarding e tutorial (pedido do criador): passos curtos, não bloqueantes, com destino clicável.
// Fica salvo na partida; pode ser pulado e reaberto pelas configurações.

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import type { GameState } from '../sim/types';
import { h } from './dom';
import { store, type Area } from './store';
import { ic } from './vis';

interface Step {
  icon: string;
  title: L;
  text: L;
  area?: Area;
  done?: (s: GameState) => boolean;
}

const STEPS: Step[] = [
  { icon: 'house', title: l('Bem-vindo à sua sede', 'Welcome to your HQ'), text: l('Esta é a sua empresa vista de cima. Cada pessoa no piso faz algo real: gravar, compor, descansar. Clique numa banda para abrir a ficha.', 'This is your company from above. Everyone on the floor is doing something real: recording, writing, resting. Click a band to open its sheet.'), area: 'hq' },
  { icon: 'calendar', title: l('A Mesa do mês', 'The monthly desk'), text: l('Aqui chegam o briefing, as decisões e as ofertas. Ignorar uma decisão aplica a opção padrão.', 'The briefing, decisions and offers land here. Ignoring a decision applies the default option.'), area: 'desk' },
  { icon: 'guitar', title: l('Seus artistas', 'Your artists'), text: l('Cada pessoa tem 100% de capacidade por mês. Monte a agenda ou deixe delegado. Veja personalidade, família e fãs.', 'Each person has 100% capacity per month. Build the agenda or leave it delegated. See personality, family and fans.'), area: 'artists' },
  { icon: 'clock', title: l('Central de decisões', 'Decision hub'), text: l('Reserve atividades até 12 meses à frente (sem custo até começar), acompanhe takes de estúdio, crises e histórias.', 'Book activities up to 12 months ahead (no cost until they start), follow studio takes, crises and stories.'), area: 'plan' },
  { icon: 'mic', title: l('Estúdio e lançamentos', 'Studio and releases'), text: l('Escolha um produtor com assinatura sonora, grave take a take e lance com um rollout: teaser, singles, clipe, álbum.', 'Pick a producer with a sonic signature, record take by take and release with a rollout: teaser, singles, video, album.'), area: 'creation' },
  { icon: 'fans', title: l('Descobrir talentos', 'Discover talent'), text: l('Olheiros, concursos e demos trazem nomes. Informação é um intervalo, nunca a verdade inteira.', 'Scouts, contests and demos bring names. Information is a range, never the full truth.'), area: 'market' },
  { icon: 'globe', title: l('O mundo muda', 'The world changes'), text: l('Guerras, censura, novas tecnologias e movimentos de cena mudam o que funciona. Veja o mapa no Mundo.', 'Wars, censorship, new technology and scene movements change what works. Check the map in World.'), area: 'world' },
  { icon: 'chart-up', title: l('Avance o tempo', 'Advance time'), text: l('Use ▶ Semana para ver dias de turnê e estúdio, ou ▶ Mês para seguir mais rápido (Ctrl+Enter).', 'Use ▶ Week to see tour and studio days, or ▶ Month to move faster (Ctrl+Enter).') },
];

export function tutorialCard(s: GameState, rerender: () => void): HTMLElement | null {
  const tu = s.tutorial;
  if (tu.done || tu.step >= STEPS.length) return null;
  const st = STEPS[tu.step];
  const next = () => {
    tu.step += 1;
    if (tu.step >= STEPS.length) tu.done = true;
    rerender();
  };
  return h('aside', { class: 'tutorial', role: 'dialog', 'aria-live': 'polite', 'aria-label': t(l('Tutorial', 'Tutorial')) },
    h('div', { class: 'tut-ic' }, ic(st.icon, 3)),
    h('div', { class: 'tut-body' },
      h('small', { class: 'muted' }, `${tu.step + 1}/${STEPS.length}`),
      h('b', null, t(st.title)),
      h('p', null, t(st.text)),
      h('div', { class: 'row' },
        st.area && store.area !== st.area ? h('button', { class: 'btn small primary', onclick: () => { store.area = st.area!; rerender(); } }, t(l('Mostrar', 'Show me'))) : null,
        h('button', { class: 'btn small', onclick: next }, tu.step === STEPS.length - 1 ? t(l('Começar!', "Let's go!")) : t(l('Próximo', 'Next'))),
        h('button', { class: 'btn small ghost', onclick: () => { tu.done = true; rerender(); } }, t(l('Pular tutorial', 'Skip tutorial'))),
      ),
    ),
  );
}

export function restartTutorial(s: GameState): void {
  s.tutorial = { step: 0, done: false, seen: [] };
}
