// Rodada 15 — Novo Jogo, aba Mundo: "História dos artistas reais" (exata / com variações / aleatória), no mesmo
// gancho newgameCards() da base de dados; e uma aba na página do ato real dizendo se ele segue o roteiro real.

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { histAltered, histMode, type HistoryMode } from '../sim/history15';
import type { GameState, RunConfig } from '../sim/types';
import { h, select } from './dom';
import { helpTip } from './newgame13';
import { newgameCards } from './newgame';
import { registerPageTab } from './registry';

const MODES: { id: HistoryMode; name: L; note: L }[] = [
  { id: 'strict', name: l('Vida real exata', 'Exact real life'), note: l('Discos reais nas datas reais, mortes, separações, voltas e trocas de formação exatamente como foram. Nenhum disco inventado nem morte sorteada para quem é real — até você interferir (contratar ou roubar um artista muda a história dele dali em diante). Liga nomes reais, modo histórico e mortes nos anos reais.', 'Real albums on their real dates; deaths, splits, reunions and lineup changes exactly as they happened. No invented albums or random deaths for real people — until you interfere (signing or poaching an artist changes their history from then on). Turns on real names, historic mode and real-year deaths.') },
  { id: 'loose', name: l('Real até o início, história alternativa depois', 'Real until the start, alternate history after'), note: l('Padrão (r18): o mundo real até o ano inicial é a base; depois, nada está escrito — discos, formações, separações, voltas, mortes, casos e mudanças de carreira são sorteados para qualquer um. Estreias reais ainda acontecem perto do ano real.', 'Default (r18): the real world up to the start year is the base; after that nothing is written — albums, lineups, splits, comebacks, deaths, affairs and career changes are rolled for anyone. Real debuts still happen near their real year.') },
  { id: 'free', name: l('Personagens reais, história alternativa', 'Real characters, alternate history'), note: l('As pessoas reais existem, com estreia e talento reais, mas a carreira é simulada: podem lançar discos que nunca existiram, pular discos reais, mudar de formação, separar ou morrer a qualquer momento. As mortes da vida real são ignoradas.', 'Real people exist with their real debut and talent, but careers are simulated: they may release albums that never existed, skip real ones, change lineups, split or die at any time. Real-life deaths are ignored.') },
];

export function historyCard(cfg: RunConfig): HTMLElement {
  const note = h('small', { class: 'muted' });
  const refresh = () => { note.textContent = t(MODES.find((m) => m.id === (cfg.history ?? 'loose'))!.note); };
  const sel = select(cfg.history ?? 'loose', MODES.map((m) => ({ value: m.id, label: t(m.name) })), (v) => {
    cfg.history = v;
    if (v === 'strict') { cfg.realNames = true; cfg.realFates = true; cfg.mode = 'historic'; }
    refresh();
  });
  refresh();
  return h('section', { class: 'card' },
    h('h3', null, t(l('História dos artistas reais', 'Real artists\' history')), ' ', helpTip(l('Escolha quanto o mundo segue a vida real. Exata: tudo como aconteceu (álbuns, mortes, separações, voltas), a menos que você mude a história contratando alguém. Com variações: o roteiro real é a base, mas a simulação improvisa. Aleatória: só os personagens são reais; o resto é sorteado. Em todos os modos, a mesma semente gera o mesmo mundo.', 'Choose how closely the world follows real life. Exact: everything as it happened (albums, deaths, splits, reunions) unless you change history by signing someone. With variations: the real script is the base, but the sim improvises. Random: only the characters are real; the rest is rolled. In every mode the same seed makes the same world.'))),
    h('label', null, t(l('Modo de história', 'History mode')), sel),
    note);
}

newgameCards().push(historyCard);

/** Texto do status histórico de um ato real (para a aba e testes). */
export function histStatus(s: GameState, id: string): L {
  const a = s.acts[id];
  const m = histMode(s);
  if (!a) return l('', '');
  if (m !== 'strict') return l('História alternativa: até o início da partida, a vida real; daqui em diante a carreira deste ato é simulada e pode divergir totalmente (discos, formação, separação, volta, morte, escândalos, outra profissão).', 'Alternate history: real life up to the start of the game; from here on this act\'s career is simulated and may diverge completely (albums, lineup, split, comeback, death, scandals, another profession).');
  if (histAltered(s, a)) return l('História alterada por você: ao entrar no seu selo (ou na sua banda), este ato saiu do roteiro da vida real. Discos, formação e fim de carreira agora dependem das suas decisões.', 'History changed by you: by joining your label (or your band), this act left the real-life script. Albums, lineup and career end now depend on your decisions.');
  if (m === 'strict') return l('Segue a vida real: discos, formação, separações e mortes acontecem nas datas reais — se você contratar este ato, a história muda dali em diante.', 'Follows real life: albums, lineup, splits and deaths happen on their real dates — if you sign this act, history changes from then on.');
  return l('Vida real com variações: os discos e formações reais são a base, mas a simulação pode inventar discos e separações.', 'Real life with variations: real albums and lineups are the base, but the sim may invent albums and splits.');
}

registerPageTab('act', {
  id: 'hist15', label: l('Vida real', 'Real life'), icon: 'calendar', order: 85,
  when: (s, id) => !!s.acts[id]?.catalogNo && !!s.config.realNames,
  render: (s, id) => h('p', { class: histAltered(s, s.acts[id]) && histMode(s) === 'strict' ? 'warn small' : 'small' }, histMode(s) !== 'strict' ? h('span', { class: 'pill warn' }, t(l('História alternativa', 'Alternate history'))) : null, ' ', t(histStatus(s, id))),
});
