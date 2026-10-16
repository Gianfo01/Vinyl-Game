// R31 · onda 4 (X) — MOTOR DE EXIBIÇÃO do interruptor "Nomes e obras reais". Puro (sem DOM, sem estado do jogo):
// recebe a tabela de trocas montada por src/sim/r31/realshow31.ts (registro realnames31 + bases reais + atos da partida)
// e troca o texto FINAL mostrado na tela (t(), nós de texto do h(), títulos e o texto pintado nas cenas). A troca é só na
// hora de mostrar: saves e simulação não mudam.
//
// Duas camadas, para não trocar homônimos:
//  - nome (camada "em frase"): nome próprio com mais de uma palavra ou palavra única que não é palavra comum, cidade,
//    país ou gênero — trocado em qualquer ponto do texto, palavra inteira, maiúsculas exatas;
//  - título (camada "inteira"): músicas, discos e nomes de uma palavra comum ("Queen", "Boston", "Help!") — só quando o
//    texto inteiro é o título, ou quando ele aparece entre aspas.
// Palavra da interface ("Elenco", "Telefone", "Status"…) que coincide com um título NÃO é trocada: t() avisa que o texto
// veio de um rótulo da interface (ui = true) e devolve a palavra com a marca invisível UI31, para o h() também não trocar.
// A família Fossati nunca é trocada (nome real sempre, regra 11 do briefing).
// R31 (NOMES): a troca vale só para NOMES DE ENTIDADES. Nunca troca número, sigla ou letra solta (texto de 1–2
// caracteres: teclas, colunas, "5", "1984"); palavra da interface gerada pela varredura (src/data/uiwords31.ts: "Nome",
// "Telefone", "Status") não troca como texto inteiro e palavra comum ("Fazer", "Total") não troca no meio da frase —
// salvo entidade conhecida (`keep`: registro à mão, atos e gravadoras), que continua protegida só pela marca UI31 do t().
import { UI_INTEXT31, UI_WHOLE31 } from './uiwords31';

export type DispPair31 = [from: string, to: string];

const UIW = new Set(UI_WHOLE31), UIT = new Set(UI_INTEXT31);
/** texto que nunca é nome de entidade: sem letra (números, datas, "99.9%") ou de até 2 caracteres ("Z", "OK", "F1") */
export const notEntity31 = (from: string): boolean => { const w = from.trim(); return [...w].length <= 2 || !/\p{L}/u.test(w); };

// R31 (BASE-IT): protege o sobrenome e os prenomes sozinhos — não nomes reais de terceiros que só dividem o prenome
// (Lucia Mannucci, Antonella Ruggiero, Gianluca Grignani vazavam com a exibição desligada)
const FAMILY_GUARD31 = /\bFossati\b|^(Efro|Lucia|Sonia|Antonella|Gianluca)$/;
const WORD = /[\p{L}\p{N}]+/gu;
const firstWord = (s: string): string | undefined => { WORD.lastIndex = 0; const m = WORD.exec(s); return m ? m[0] : undefined; };
const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);

let byFirst = new Map<string, DispPair31[]>();
let whole = new Map<string, string>();
let active = false;

/** Monta a tabela (chamado ao abrir a partida e ao trocar o interruptor). Lista vazia desliga o filtro. `keep`: nomes
 *  de entidade conhecida que trocam mesmo coincidindo com uma palavra da interface. */
export function setDisplay31(names: DispPair31[], titles: DispPair31[], keep?: ReadonlySet<string>): void {
  const idx = new Map<string, DispPair31[]>();
  const w = new Map<string, string>();
  const late: DispPair31[] = [];
  for (const [from, to] of names) {
    if (!from || from === to || FAMILY_GUARD31.test(from) || notEntity31(from)) continue;
    if ((UIT.has(from) || UIW.has(from.trim())) && !keep?.has(from)) { late.push([from, to]); continue; } // palavra comum: só como texto inteiro
    const k = firstWord(from);
    if (!k) continue;
    let arr = idx.get(k);
    if (!arr) idx.set(k, (arr = []));
    arr.push([from, to]);
    if (!w.has(from)) w.set(from, to);
  }
  for (const arr of idx.values()) arr.sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of [...late, ...titles]) {
    if (!from || from === to || FAMILY_GUARD31.test(from) || notEntity31(from) || w.has(from)) continue;
    if (UIW.has(from.trim()) && !keep?.has(from)) continue; // palavra da interface ("Nome", "Telefone")
    w.set(from, to);
  }
  byFirst = idx;
  whole = w;
  active = idx.size > 0 || w.size > 0;
}

export const display31Active = (): boolean => active;

function swapNames(text: string): string {
  if (!byFirst.size) return text;
  let out = '';
  let last = 0;
  WORD.lastIndex = 0;
  for (let m = WORD.exec(text); m; m = WORD.exec(text)) {
    const pos = m.index;
    if (pos < last) continue;
    const cands = byFirst.get(m[0]);
    if (!cands) continue;
    for (const [from, to] of cands) {
      if (!text.startsWith(from, pos)) continue;
      const end = pos + from.length;
      if (isWordChar(text[end]) && isWordChar(from[from.length - 1])) continue;
      out += text.slice(last, pos) + to;
      last = end;
      WORD.lastIndex = end;
      break;
    }
  }
  return last ? out + text.slice(last) : text;
}

/** Marca invisível de "palavra da interface" (posta por t(); disp31 tira antes de mostrar). */
export const UI31 = '\u2063';
/** Tira a marca UI31 (texto que não passa pelo disp31: atributos, value…). */
export const plain31 = (text: string): string => (text.includes(UI31) ? text.split(UI31).join('') : text);

const QUOTED = /(["“«'‘])([^"”»'’\n]{1,90})(["”»'’])/g;

/** Texto final com as trocas (sem filtro ligado, devolve o mesmo texto). `ui`: o texto é um rótulo da interface, não o
 *  nome de uma gravadora, ato ou obra — a camada "inteira" não troca, e o texto volta marcado (UI31) para o h(). */
export function disp31(text: string, ui = false): string {
  if (!text) return text;
  // marca vinda de um t() anterior: não troca; só t() (ui = true) devolve marcado — o h() mostra sem a marca
  const marked = text.includes(UI31);
  if (marked) text = plain31(text);
  if (!active) return text;
  const trimmed = text.trim();
  const w = whole.get(trimmed);
  if (w !== undefined) return ui ? UI31 + text : marked ? text : text.replace(trimmed, w);
  let s = text;
  if (whole.size && /["“«'‘]/.test(s)) s = s.replace(QUOTED, (all, a: string, inner: string, b: string) => { const r = whole.get(inner); return r === undefined ? all : a + r + b; });
  return swapNames(s);
}
