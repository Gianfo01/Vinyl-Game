// Rodada 28 (F4) — dados puros (sem efeitos colaterais, seguros de importar pela interface): prazo escolhido na Nova run
// e os começos sorteados pela semente. Quem aplica no jogo é src/sim/sys/start28.ts (gancho 'newgame').

import { Rng } from '../core/rng';
import { l, type L } from '../data/world';

// ---------------------------------------------------------------- prazo escolhido (início e fim na Nova run)

/** Prazo sugerido pelo Recomendado (editável na Nova run). */
export const REC_YEARS28 = 25;
/** Último ano aceito como fim de partida. */
export const END_MAX28 = 2100;
/** Ano final (inclusive) de uma partida de `years` anos; null = sem fim (sandbox). */
export const endOf28 = (start: number, years: number | undefined): number | null => (years ? start + years - 1 : null);
/** Anos de partida para um fim escolhido (limitado a [início, END_MAX28]); null/0 = sem fim. */
export function yearsFor28(start: number, end: number | null | undefined): number {
  if (!end || !Number.isFinite(end)) return 0;
  return Math.max(start, Math.min(END_MAX28, Math.round(end))) - start + 1;
}

// ---------------------------------------------------------------- (1) começo sorteado

export interface Start28 {
  id: string;
  name: L;
  text: L;
  /** fator sobre o caixa inicial (1 = igual) */
  cash: number;
  /** pontos somados à reputação (0–100) */
  rep: Partial<Record<'artistic' | 'commercial' | 'artists' | 'institutional', number>>;
}

export const STARTS28: Start28[] = [
  { id: 'calm', name: l('Começo tranquilo', 'A quiet start'), text: l('Nada de especial: o caixa de sempre e uma cidade que ainda não sabe seu nome.', 'Nothing special: the usual cash and a city that does not know your name yet.'), cash: 1, rep: {} },
  { id: 'inherit', name: l('Herança da tia', "Auntie's inheritance"), text: l('Uma tia deixou um dinheiro e um conselho: "gaste com música, não com carro".', 'An aunt left some money and a piece of advice: "spend it on music, not on cars".'), cash: 1.3, rep: {} },
  { id: 'debt', name: l('Começa devendo', 'Starting in debt'), text: l('O equipamento foi comprado fiado. Menos caixa — mas os músicos da cidade sabem que você arrisca.', 'The gear was bought on credit. Less cash — but the city\'s musicians know you take risks.'), cash: 0.75, rep: { artists: 8 } },
  { id: 'radio', name: l('Amigo na rádio', 'A friend at the station'), text: l('Um velho colega virou programador de rádio. Ele não promete nada, mas atende o telefone.', 'An old friend became a radio programmer. He promises nothing, but he picks up the phone.'), cash: 0.95, rep: { commercial: 7 } },
  { id: 'critic', name: l('A crítica gostou de você', 'The critics like you'), text: l('Um texto elogioso sobre seu primeiro projeto circula entre jornalistas.', 'A glowing piece about your first project is making the rounds among journalists.'), cash: 0.95, rep: { artistic: 8 } },
  { id: 'scene', name: l('Cena fervendo', 'A scene on the boil'), text: l('A sua cidade está numa noite boa: casas cheias e gente nova toda semana. As portas se abrem mais fácil.', 'Your city is having a good night: packed rooms and new faces every week. Doors open more easily.'), cash: 1, rep: { institutional: 6, artists: 3 } },
];
export const start28ById = (id?: string): Start28 | undefined => STARTS28.find((x) => x.id === id);

/** Começo sorteado para a semente (puro e determinístico). */
export function pickStart28(seed: string): Start28 {
  const r = Rng.fromSeed(`start28:${seed.trim()}`);
  return STARTS28[r.int(0, STARTS28.length - 1)];
}
