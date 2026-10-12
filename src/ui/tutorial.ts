// Onboarding e tutorial (pedido do criador): passos curtos, não bloqueantes, com destino clicável.
// Fica salvo na partida; pode ser pulado e reaberto pelas configurações.

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import type { GameState } from '../sim/types';
import { h } from './dom';
import { savePrefs, store, type Area } from './store';
import { setTutorials19, tutAllowed19 } from './tutoff19';
import { toast } from './common';
import { ic } from './vis';
import { tutorialIntro14 } from './tutorial14';
import { careers } from '../sim/sys/careers12';

export interface Step {
  icon: string;
  title: L;
  text: L;
  area?: Area;
  done?: (s: GameState) => boolean;
  /** r23: só para esta carreira */
  only?: 'label';
}

// r23 (C): o jogo abre no Cockpit — o passo 1 ensina o Cockpit (caixa, próximo passo, contratar); a sede vem depois.
const STEPS: Step[] = [
  { icon: 'calendar', title: l('Bem-vindo ao seu Cockpit', 'Welcome to your Cockpit'), text: l('Comece por aqui: no topo está o caixa (quanto dura o dinheiro); "Hoje" diz o próximo passo. O primeiro de todos é contratar um artista.', 'Start here: the cash is at the top (how long the money lasts); "Today" tells you the next step. The very first one is signing an artist.'), area: 'cockpit' },
  { icon: 'fans', title: l('Contrate um artista', 'Sign an artist'), text: l('Olheiros, concursos e demos trazem nomes. Informação é um intervalo, nunca a verdade inteira. Faça uma oferta a quem cabe no seu caixa.', 'Scouts, contests and demos bring names. Information is a range, never the full truth. Make an offer to someone your cash can carry.'), area: 'market' },
  { icon: 'guitar', title: l('Seus artistas', 'Your artists'), text: l('Cada pessoa tem 100% de capacidade por mês. Monte a agenda ou deixe delegado. Veja personalidade, família e fãs.', 'Each person has 100% capacity per month. Build the agenda or leave it delegated. See personality, family and fans.'), area: 'artists' },
  { icon: 'mic', title: l('Estúdio e lançamentos', 'Studio and releases'), text: l('Escolha um produtor com assinatura sonora, grave take a take e lance com um rollout: teaser, singles, clipe, álbum.', 'Pick a producer with a sonic signature, record take by take and release with a rollout: teaser, singles, video, album.'), area: 'creation' },
  { icon: 'clock', title: l('Central de decisões', 'Decision hub'), text: l('Reserve atividades até 12 meses à frente (sem custo até começar), acompanhe takes de estúdio, crises e histórias. Ignorar uma decisão aplica a opção padrão.', 'Book activities up to 12 months ahead (no cost until they start), follow studio takes, crises and stories. Ignoring a decision applies the default option.'), area: 'plan' },
  { icon: 'house', title: l('Visite sua sede', 'Visit your HQ'), text: l('Esta é a sua empresa vista de cima. Cada pessoa no piso faz algo real: gravar, compor, descansar. Clique numa banda para abrir a ficha.', 'This is your company from above. Everyone on the floor is doing something real: recording, writing, resting. Click a band to open its sheet.'), area: 'hq', only: 'label' },
  { icon: 'globe', title: l('O mundo muda', 'The world changes'), text: l('Guerras, censura, novas tecnologias e movimentos de cena mudam o que funciona. Veja o mapa no Mundo.', 'Wars, censorship, new technology and scene movements change what works. Check the map in World.'), area: 'world' },
  { icon: 'chart-up', title: l('Avance o tempo', 'Advance time'), text: l('Use ▶ Semana para ver dias de turnê e estúdio, ou ▶ Mês para seguir mais rápido (Ctrl+Enter).', 'Use ▶ Week to see tour and studio days, or ▶ Month to move faster (Ctrl+Enter).') },
];
/** r23 (C): passos que valem para as carreiras ativas (a sede só para quem tem selo). */
export function tutSteps23(active: string[]): Step[] {
  const label = active.includes('label') || !active.length;
  return STEPS.filter((x) => !x.only || (x.only === 'label' && label));
}

export function tutorialCard(s: GameState, rerender: () => void): HTMLElement | null {
  const tu = s.tutorial;
  const STEPS = tutSteps23(careers(s).active);
  if (tu.done || tu.step >= STEPS.length || !tutAllowed19(store.prefs, 'card')) return null; // r19: "Sem tutoriais"
  const st0 = STEPS[tu.step];
  const st: Step = tu.step === 0 ? { ...st0, ...tutorialIntro14(careers(s).active), area: tutorialIntro14(careers(s).active).area as Area } : st0;
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
        h('button', { class: 'btn small ghost tut19-off', onclick: () => { setTutorials19(store.prefs, false); savePrefs(); tu.done = true; rerender(); toast(t(l('Tutoriais desativados. Religue em Configurações.', 'Tutorials off. Turn them back on in Settings.')), 'info'); } }, t(l('Desativar todos os tutoriais', 'Turn off all tutorials'))),
      ),
    ),
  );
}

export function restartTutorial(s: GameState): void {
  s.tutorial = { step: 0, done: false, seen: [] };
}
