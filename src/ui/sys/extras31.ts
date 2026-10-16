// R31 · onda 4 (N) — Mundo › Extras: a praça Efro e Lucia Fossati (placa clicável), a Arara Trips e a arara mascote, o
// filme "L'educazione della nonna" (2027), a bolha do token, as bandas de ficção no mundo e o diário de cultura pop, com o
// controle central de frequência e de tom. Abrir a aba não muda nada; só os botões agem (motor em sim/sys/extras31.ts).
// No mapa da cidade: a placa da praça ao lado da sede e, às vezes, uma arara no letreiro (clicar dá uma frase).
import { FICTION31 } from '../../data/fiction31';
import { POP31 } from '../../data/pop31';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { setSw, sw } from '../../sim/r31/switches';
import {
  ARARA_W31, DEDICATION31, FILM31, FILM_YEAR31, PLAQUE31, araraEra31, araraOn31, edisonMary31, filmSoundtrack31, hireArara31, popFreq31, popTone31, sellToken31, x31,
  type XRes31,
} from '../../sim/sys/extras31';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { pill, rerender, section } from '../common';
import { h, select } from '../dom';
import { registerTab } from '../registry';
import { lockBtn31 } from '../r31/lock31';
import { store } from '../store';
import { cityEggs27, hqClickEggs27 } from './eggs27';
import { note } from './world4/util';

let actSel = '';
let last: XRes31 | null = null;
let plaqueOpen = false;
const run = (f: () => XRes31) => () => { last = f(); rerender(); };

// ---------------------------------------------------------------- pixel art (estilo antigo: contorno escuro quente, luz de cima à esquerda)

const INK = '#2a1a12';
function px(c: CanvasRenderingContext2D, x: number, y: number, w: number, hh: number, col: string): void { c.fillStyle = col; c.fillRect(x, y, w, hh); }
/** Placa de bronze num pedestal de pedra, com um canteiro: 14×16 px. */
export function drawPlaque31(c: CanvasRenderingContext2D, x: number, y: number): void {
  px(c, x + 1, y + 14, 12, 2, '#3f6b2a'); px(c, x + 2, y + 13, 10, 1, '#5d8f3a'); // canteiro
  px(c, x + 3, y + 7, 8, 7, INK); px(c, x + 4, y + 8, 6, 6, '#9a948a'); px(c, x + 4, y + 8, 2, 6, '#b9b3a8'); // pedestal
  px(c, x + 1, y, 12, 8, INK); px(c, x + 2, y + 1, 10, 6, '#a8742e'); px(c, x + 2, y + 1, 10, 1, '#d6a456'); px(c, x + 2, y + 1, 1, 6, '#c48c3e'); // bronze
  px(c, x + 4, y + 3, 6, 1, '#6e4518'); px(c, x + 4, y + 5, 4, 1, '#6e4518'); // letras
  px(c, x + 12, y + 12, 1, 2, '#c2463c'); px(c, x + 1, y + 12, 1, 2, '#e0c048'); // flores
}
/** Arara pousada: 7×9 px (vermelha, azul e amarela). */
export function drawMacaw31(c: CanvasRenderingContext2D, x: number, y: number, tm: number): void {
  const bob = Math.round(Math.sin(tm * 2) * 0.6);
  px(c, x + 2, y + bob, 3, 1, INK); px(c, x + 1, y + 1 + bob, 5, 3, INK);
  px(c, x + 2, y + 1 + bob, 3, 2, '#d8322a'); px(c, x + 5, y + 2 + bob, 1, 1, '#f2f0e6'); px(c, x + 6, y + 2 + bob, 1, 1, INK); // cabeça, olho, bico
  px(c, x + 1, y + 4, 5, 3, INK); px(c, x + 2, y + 4, 3, 2, '#d8322a'); px(c, x + 2, y + 5, 2, 1, '#2f6fd0'); px(c, x + 4, y + 5, 1, 1, '#e8c23a'); // corpo e asa
  px(c, x + 3, y + 7, 1, 2, '#2f6fd0'); px(c, x + 2, y + 8, 1, 1, '#d8322a'); // cauda
}

const MACAW_LINES31: L[] = [
  l('"Rrrrrá! Mais um disco, mais um disco!"', '"Squawk! One more record, one more record!"'),
  l('"Arara! Arara! Turnê confirmada!"', '"Arara! Arara! Tour confirmed!"'),
  l('A arara inclina a cabeça para o letreiro e assobia o refrão do último sucesso do selo.', 'The macaw tilts its head at the sign and whistles the chorus of the label\'s latest hit.'),
  l('"Quem quer biscoito? Quem quer contrato?"', '"Who wants a cracker? Who wants a contract?"'),
];
/** A arara aparece em algumas semanas (só leitura do relógio do jogo; não consome sorte). */
export const macawHere31 = (g: GameState): boolean => (g.week * 7 + 3) % 5 === 0;

cityEggs27.push((g, o) => (o.city !== g.config.homeCity ? null : {
  id: 'fossati_plaque31', w: 14, h: 16, dx: -34, dy: 2, title: l('Praça Efro e Lucia Fossati', 'Efro and Lucia Fossati Square'),
  draw: (c, x, y) => drawPlaque31(c, x, y), onClick: () => PLAQUE31,
}));
cityEggs27.push((g, o) => (o.city !== g.config.homeCity || !macawHere31(g) ? null : {
  id: 'macaw31', w: 7, h: 9, dx: -6, dy: -26, title: l('Uma arara no letreiro', 'A macaw on the sign'),
  draw: (c, x, y, tm) => drawMacaw31(c, x, y, tm), onClick: (s) => MACAW_LINES31[s.week % MACAW_LINES31.length],
}));
// fonógrafo da Sede: o "Mary" original toca no primeiro clique da partida (depois, o ovo de sempre do gramofone)
{
  const prev = hqClickEggs27.gramophone;
  hqClickEggs27.gramophone = (g) => edisonMary31(g) ?? prev?.(g) ?? null;
}

// ---------------------------------------------------------------- logotipo especial do selo "Arara"

export const araraLabel31 = (g: GameState): boolean => /\barara\b/i.test(g.config.companyName ?? '');
function araraLogo31(): HTMLElement {
  const cv = h('canvas', { width: 40, height: 22, class: 'px', style: 'width:120px;height:66px;image-rendering:pixelated', role: 'img', 'aria-label': t(l('Logotipo especial do selo Arara', 'Special Arara label logo')) }) as HTMLCanvasElement;
  const c = cv.getContext('2d');
  if (c) {
    px(c, 0, 0, 40, 22, INK); px(c, 1, 1, 38, 20, '#f2e6c8');
    px(c, 3, 3, 16, 16, INK); px(c, 4, 4, 14, 14, '#1d7a4a'); px(c, 5, 5, 12, 2, '#2c9a5e'); // disco verde
    px(c, 10, 10, 2, 2, '#f2e6c8');
    drawMacaw31(c, 22, 6, 0); drawMacaw31(c, 30, 8, 1.3);
  }
  return cv;
}

// ---------------------------------------------------------------- aba

function controls31(s: GameState): HTMLElement {
  return h('div', { class: 'row' },
    h('label', null, t(l('Referências por mês', 'References per month')), ' ', select(popFreq31(s), [0, 1, 2, 3].map((v) => ({ value: v, label: t([l('nenhuma', 'none'), l('poucas (até 1)', 'few (up to 1)'), l('normal (até 2)', 'normal (up to 2)'), l('muitas (até 3)', 'many (up to 3)')][v]) })), (v) => { setSw(s, 'pop31.freq', v); rerender(); })),
    h('label', null, t(l('Tom', 'Tone')), ' ', select(popTone31(s), [{ value: 'normal' as const, label: t(l('normal', 'normal')) }, { value: 'contido' as const, label: t(l('contido (menos humor, sem memes)', 'restrained (less humor, no memes)')) }], (v) => { setSw(s, 'pop31.tone', v); rerender(); })),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: sw<boolean>(s, 'pop31.serio'), onchange: (e: Event) => { setSw(s, 'pop31.serio', (e.target as HTMLInputElement).checked); rerender(); } }), ' ', t(l('Humor em situações sérias', 'Humor in serious situations'))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: sw<boolean>(s, 'fic31'), onchange: (e: Event) => { setSw(s, 'fic31', (e.target as HTMLInputElement).checked); rerender(); } }), ' ', t(l('Bandas de filmes, séries e animações no mundo', 'Bands from films, series and cartoons in the world'))));
}

export function extrasTab31(s: GameState): HTMLElement {
  const acts = playerActs(s);
  if (!acts.includes(actSel)) actSel = acts[0] ?? '';
  const st = x31(s);
  const on = sw<boolean>(s, 'extras31');
  const pick = acts.length ? h('select', { 'aria-label': t(l('Artista', 'Artist')), onchange: (e: Event) => { actSel = (e.target as HTMLSelectElement).value; } },
    acts.map((id) => h('option', { value: id, selected: id === actSel ? true : undefined }, s.acts[id]?.name ?? ''))) : null;
  const offL = l('Extras desligados nesta partida (Opções › Interruptores).', 'Extras are off in this game (Options › Switches).');
  const noAct = l('Contrate um artista primeiro.', 'Sign an artist first.');
  const plaque = h('canvas', { width: 14, height: 16, class: 'px', style: 'width:56px;height:64px;image-rendering:pixelated;cursor:pointer', role: 'button', tabindex: 0,
    'aria-label': t(l('Placa da praça Efro e Lucia Fossati (clique para ler)', 'Efro and Lucia Fossati Square plaque (click to read)')),
    onclick: () => { plaqueOpen = !plaqueOpen; rerender(); }, onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); plaqueOpen = !plaqueOpen; rerender(); } } }) as HTMLCanvasElement;
  const pc = plaque.getContext('2d');
  if (pc) drawPlaque31(pc, 0, 0);
  const fics = Object.entries(st.fic).map(([fid, aid]) => ({ f: FICTION31.find((x) => x.id === fid), a: s.acts[aid] })).filter((x) => x.f && x.a);
  const log = st.log.slice(0, 12).map(([y, m, id]) => {
    const p = POP31.find((x) => x.id === id);
    const f = FICTION31.find((x) => x.id === id);
    const text = p ? t(p.text).replace(/\{city\}/g, t(l('sua cidade', 'your city'))) : f ? `${s.acts[st.fic[f.id]]?.name ?? f.n} · ${f.obra}` : id;
    return h('li', { class: 'small' }, `${m + 1}/${y} · `, text);
  });
  const filmOpen = s.year === FILM_YEAR31 && st.film?.open !== undefined && !st.film.act;
  return h('div', null,
    h('p', { class: 'small muted' }, t(DEDICATION31), ' ', t(l('Aqui ficam os extras: homenagens, referências e brincadeiras. Nada disso é necessário para competir.', 'Extras live here: tributes, references and jokes. None of it is needed to compete.'))),
    araraLabel31(s) ? section(t(l('Selo Arara', 'Arara label')), araraLogo31(), note(l('Logotipo especial liberado pelo nome do selo.', 'Special logo unlocked by the label name.'))) : null,
    section(t(l('Praça Efro e Lucia Fossati', 'Efro and Lucia Fossati Square')),
      h('div', { class: 'row' }, plaque, plaqueOpen ? h('p', { class: 'small' }, t(PLAQUE31)) : note(l('Clique na placa para ler. Ela também está no mapa da cidade, ao lado da sua sede.', 'Click the plaque to read it. It is also on the city map, next to your HQ.')))),
    section(t(l('Arara Trips', 'Arara Trips')),
      h('p', { class: 'small' }, t(l('Agência de viagens da cidade, fundada por Gianluca Fossati, que organiza a logística das turnês com o jeito de cada época: ', 'The city\'s travel agency, founded by Gianluca Fossati, which handles tour logistics in the style of each era: ')), t(araraEra31(s.year))),
      araraOn31(s) ? h('p', null, pill(t(l('contratada', 'hired')), 'good'), ' ', h('small', { class: 'muted' }, t(l('menos risco de cancelar shows nas suas turnês', 'less risk of cancelled shows on your tours')))) : null,
      lockBtn31(t(l(`Contratar por ${ARARA_W31} semanas`, `Hire for ${ARARA_W31} weeks`)), !on ? offL : araraOn31(s) ? l('Já contratada.', 'Already hired.') : null, run(() => hireArara31(s))),
      note(macawHere31(s) ? l('Uma arara de verdade está pousada no letreiro da sede hoje (veja no mapa).', 'A real macaw is perched on the HQ sign today (see the map).') : l('Às vezes uma arara de verdade pousa no letreiro da sede.', 'Sometimes a real macaw perches on the HQ sign.'))),
    section(t(l(`O filme: ${FILM31}`, `The film: ${FILM31}`)),
      h('p', { class: 'small' }, t(l('Coprodução Brasil–Itália, com estreia em 2027 nos cinemas de São Paulo e de Milão. O elo Brasil–Itália do jogo, ao lado da escola de idiomas da Antonella e da origem italiana da família.', 'A Brazil–Italy co-production premiering in 2027 in cinemas in São Paulo and Milan. The game\'s Brazil–Italy link, alongside Antonella\'s language school and the family\'s Italian roots.'))),
      st.film?.act ? h('p', null, pill(t(l('trilha gravada', 'soundtrack recorded')), 'good'), ' ', s.acts[st.film.act]?.name ?? '') : null,
      h('div', { class: 'row' }, pick, lockBtn31(t(l('Oferecer um artista para a canção-tema', 'Offer an artist for the theme song')),
        !on ? offL : !acts.length ? noAct : !filmOpen ? (st.film?.act ? l('A trilha já foi gravada.', 'The soundtrack is done.') : l('A vaga abre na estreia, em março de 2027.', 'The slot opens at the premiere, in March 2027.')) : null,
        run(() => filmSoundtrack31(s, actSel))))),
    s.year >= 2020 && s.year <= 2023 ? section(t(l('A febre dos tokens', 'The token craze')),
      note(l('Vender o "token" de um disco no auge (2021) dá dinheiro rápido e irrita parte dos fãs; em 2022 quase todos valem zero.', 'Selling a record "token" at the peak (2021) makes fast money and annoys some fans; by 2022 almost all are worth nothing.')),
      lockBtn31(t(l('Vender o token de um disco', 'Sell a record token')), !on ? offL : !acts.length ? noAct : s.year < 2021 || s.year > 2022 ? l('Só em 2021–22.', 'Only in 2021–22.') : st.nft !== undefined ? l('Você já vendeu um nesta bolha.', 'You already sold one in this bubble.') : null,
        run(() => sellToken31(s, actSel)))) : null,
    last ? h('p', { class: last.ok ? 'small good' : 'small bad', role: 'status' }, t(last.text)) : null,
    section(t(l('Bandas de filmes, séries e animações', 'Bands from films, series and cartoons')),
      fics.length ? h('ul', null, fics.map(({ f, a }) => h('li', { class: 'small' }, h('b', null, a!.name), ` — ${f!.obra} (${f!.obraAno})`, f!.fan ? h('span', { class: 'muted' }, ` · ${f!.fan}`) : null)))
        : note(l('Nenhuma ainda: elas surgem no ano em que a história se passa e dá para contratá-las como qualquer artista.', 'None yet: they appear in the year their story is set and can be signed like any artist.'))),
    section(t(l('Cultura pop, memes e bolhas', 'Pop culture, memes and bubbles')), controls31(s),
      log.length ? h('ul', null, log) : note(l('Nada por enquanto. As referências aparecem como notícia, poucas por mês.', 'Nothing yet. References show up as news, a few per month.'))));
}
registerTab('worldHub', { id: 'extras31', label: l('Extras', 'Extras'), icon: 'star', order: 59, render: extrasTab31 });

/** Linhas das Opções (dentro da partida): o mesmo controle central de frequência e de tom. */
export function settingsExtras31(): HTMLElement | null {
  const s = store.game;
  if (!s) return null;
  return h('fieldset', { class: 'small' }, h('legend', null, t(l('Cultura pop e humor', 'Pop culture and humor'))), controls31(s));
}

