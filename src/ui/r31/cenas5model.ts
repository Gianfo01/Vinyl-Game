// R31 · onda 5 (CENAS5) — MODELO PURO DAS CENAS DE LUGAR NO JOGO EXPLORÁVEL (atrás de `exp5.nav`). Com o interruptor
// ligado, toda cena de lugar (interiores da cidade, loja, aeroporto, leilões, beco, alfândega, vitrine, casas, festival,
// salas da sede, cenas de mecânica, encontros do AMOR, casa Fossati…) é SÓ o cenário navegável:
//   · sem "Cena / Ver como lista", "Mostrar tudo que é clicável", "Rótulos", a caixa tracejada de ajuda e a lista
//     "Pontos desta cena": rótulos no passar do mouse/foco e com Alt (que também mostra tudo o que é clicável);
//   · a ajuda do lugar vai para o "?" da casca; o título vai para a faixa de lugar; voltar = Esc/Backspace ou "◂ Cidade";
//   · bloqueio (🔒 motivo) aparece no próprio objeto, antes do clique;
//   · tudo o que a lista mostrava é ponto da cena, alcançável por clique, Tab e setas (ordem de leitura).
// Desligado, tudo fica como hoje (`sceneChrome5(false)` = a moldura antiga inteira). Só interface: nada aqui muda o mundo.

import { l, type L } from '../../data/world';

/** Peças da moldura antiga de uma cena (o que aparece em volta do desenho). */
export interface Chrome5 {
  /** "Cena / Ver como lista" (e o próprio modo lista) */
  list: boolean;
  /** "Mostrar tudo que é clicável" */
  showAll: boolean;
  /** "Rótulos" (sempre visíveis) */
  labels: boolean;
  /** a caixa tracejada de ajuda da primeira visita ("Entendi") */
  intro: boolean;
  /** "Pontos desta cena (n)" embaixo */
  points: boolean;
  /** legenda escrita embaixo do desenho (vai para a ajuda "?") */
  legend: boolean;
  /** barra antiga com "← Voltar à cidade" + título (vira a faixa de lugar da casca) */
  backBar: boolean;
}

const OLD5: Chrome5 = { list: true, showAll: true, labels: true, intro: true, points: true, legend: true, backBar: true };
const NEW5: Chrome5 = { list: false, showAll: false, labels: false, intro: false, points: false, legend: false, backBar: false };

/** O que a moldura de uma cena mostra: `nav` = exp5.nav ligado (só o cenário) ou desligado (igual a hoje). */
export const sceneChrome5 = (nav: boolean): Chrome5 => ({ ...(nav ? NEW5 : OLD5) });

/** Ponto mínimo para ordem/teclado (o mesmo `Spot31` dos modelos das cenas). */
export interface Pt5 { id: string; x: number; y: number; w: number; h: number }

/** Ordem de leitura dos pontos (linhas de cima para baixo, depois da esquerda para a direita): é a ordem do Tab. Cada id
 *  aparece uma vez; nenhum ponto fica de fora (inclusive os "quietos", sem rótulo por cima). */
export function order5(pts: readonly Pt5[]): string[] {
  return [...new Set(sorted5(pts).map((p) => p.id))];
}
/** Os próprios pontos na ordem de leitura (todos, inclusive repetidos: é o que a cena desenha como botões). */
export function sorted5<P extends Pt5>(pts: readonly P[]): P[] {
  const row = (p: Pt5) => Math.round((p.y + p.h / 2) / 24);
  return [...pts].sort((a, b) => row(a) - row(b) || (a.x + a.w / 2) - (b.x + b.w / 2) || a.id.localeCompare(b.id));
}

/** Setas: → e ↓ vão ao próximo ponto na ordem de leitura, ← e ↑ ao anterior (dá a volta). Sem atual = o primeiro. */
export function step5(order: readonly string[], cur: string | undefined, d: 1 | -1): string | undefined {
  if (!order.length) return undefined;
  const i = cur ? order.indexOf(cur) : -1;
  if (i < 0) return d > 0 ? order[0] : order[order.length - 1];
  return order[(i + d + order.length) % order.length];
}

/** Separa o motivo do bloqueio que os modelos põem na dica ("dica 🔒 motivo") para virar selo no próprio objeto. */
export function splitLock5(tip: L): { tip: L; lock?: L } {
  const cut = (x: string): [string, string] | null => { const i = x.indexOf(' 🔒 '); return i < 0 ? null : [x.slice(0, i), x.slice(i + 4)]; };
  const pt = cut(tip.pt), en = cut(tip.en);
  if (!pt) return { tip };
  return { tip: l(pt[0], en ? en[0] : tip.en), lock: l(pt[1], en ? en[1] : pt[1]) };
}

/** Texto da ajuda "?" de um lugar: a frase do lugar + cada objeto com o que faz (um por id, sem os sub-pontos "a:b"). */
export interface Help5 { title: L; intro: L; rows: { label: L; tip: L; lock?: L }[]; legend?: string }
export function help5Of(title: L, intro: L, spots: readonly { id: string; label: L; tip: L }[], legend?: string): Help5 {
  const by = new Map<string, { label: L; tip: L; lock?: L }>();
  for (const sp of spots) { if (sp.id.includes(':')) continue; if (!by.has(sp.id)) { const x = splitLock5(sp.tip); by.set(sp.id, { label: sp.label, tip: x.tip, lock: x.lock }); } }
  return { title, intro, rows: [...by.values()], legend };
}

/** Linha fixa da ajuda de toda cena no modo novo (como se navega). */
export const HOW5: L = l('Passe o mouse ou use Tab/setas para ver o nome e a dica de cada ponto; segure Alt para ver todos os nomes e tudo o que é clicável. Clique (ou Enter) abre; clique direito abre o painel rápido. Esc ou Backspace volta.',
  'Hover or use Tab/arrows to see each point\'s name and hint; hold Alt to see every name and everything clickable. Click (or Enter) opens; right-click opens the quick panel. Esc or Backspace goes back.');
