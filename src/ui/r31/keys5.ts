// R31 · onda 5 (TEC) — MAPA FINAL DE TECLAS, fonte única (sem DOM; testes em tests/r31-w5-tec.test.ts).
// Documento: docs/r31/onda5-teclas.md (a tabela de lá é gerada daqui).
//
// Uma tecla por objeto, por lugar (viagem) e por função do sistema. Parte dos atalhos que já existem (KEY17, Shift+1…6,
// Ctrl K, ?, { }, Ctrl+Enter) e só muda o que o pedido manda: E = caixa de entrada, G = agenda, H = sede, C = quadro de
// planejamento, Shift+1…4 = viagem, Esc = pausa, Alt = mostrar nomes. Teclas antigas de páginas que viraram marcador de
// um objeto (P, Q, R, 0, 8) continuam valendo e abrem o objeto já no marcador ("teclas de marcador").
//
// Tudo atrás de `exp5.nav` (desligado): com o interruptor desligado ninguém lê este arquivo para decidir tecla.
//
// Formato de tecla ("chord"), sempre minúsculo:
//   'a'…'z', '0'…'9'          tecla simples
//   'shift+a', 'shift+1'       Shift + letra ou dígito (só letras e dígitos aceitam Shift: Shift+[ é '{')
//   ';' "'" '\\' '[' ']' ',' '.' '-' '=' '/' '?' '{' '}'   símbolos (como o navegador entrega em `key`)
//   'ctrl+k', 'ctrl+enter'     Ctrl (ou Cmd) + tecla — reservados ao sistema, não configuráveis
//   'escape', 'tab', 'alt'     teclas especiais ('alt' = segurar)

import { l, type L } from '../../data/world';

export type Region5 = 'sede' | 'casa' | 'cidade' | 'mundo';
export type Sys5 = 'search' | 'search2' | 'advance' | 'keys' | 'prevTab' | 'nextTab' | 'pause' | 'names' | 'houses' | 'home';

/** O que a tecla faz. */
export type Act5 =
  | { kind: 'object'; id: string }
  | { kind: 'marker'; obj: string; area: string; tab?: [string, string] }
  | { kind: 'travel'; id: Region5 }
  | { kind: 'sys'; id: Sys5 }
  | { kind: 'local'; id: string };

export interface Bind5 {
  /** id estável da ligação ('obj:mural', 'mark:people', 'travel:sede', 'sys:search', 'inbox:next'…) */
  id: string;
  chord: string;
  act: Act5;
  label: L;
  /** 'global' ou o id do papel aberto em que a tecla vale (ex.: 'correspondencia') */
  scope: string;
  /** não pode ser trocada pelo jogador (sistema, Ctrl, Esc) */
  fixed?: boolean;
  /** tecla de antes da onda 5 para a mesma função (documentação e ajuda "mudou de lugar") */
  legacy?: string;
}

// ---------------------------------------------------------------- formato e leitura do teclado

const SYMBOLS5 = new Set([';', "'", '\\', '[', ']', ',', '.', '-', '=', '/', '?', '{', '}', '`']);
const SPECIAL5 = new Set(['escape', 'tab', 'alt', 'enter']);

/** A tecla está no formato aceito? */
export function validChord5(c: string): boolean {
  if (/^[a-z0-9]$/.test(c)) return true;
  if (/^shift\+[a-z0-9]$/.test(c)) return true;
  if (/^ctrl\+([a-z0-9]|enter)$/.test(c)) return true;
  return SYMBOLS5.has(c) || SPECIAL5.has(c);
}

/** Forma mínima do evento de teclado (testável sem DOM). */
export interface KeyEv5 { key: string; code?: string; shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }

/** Evento → tecla no formato acima ('' = nada que o jogo use). Letras pelo `key` (respeita o layout do teclado);
 *  dígitos com Shift pelo `code` (Shift+1 vira '!' no `key`). */
export function chordOf5(e: KeyEv5): string {
  const k = e.key ?? '';
  if (k === 'Alt' || k === 'AltGraph') return 'alt';
  if (k === 'Escape' || k === 'Esc') return 'escape';
  if (e.ctrlKey || e.metaKey) {
    if (k === 'Enter') return 'ctrl+enter';
    return /^[a-z0-9]$/i.test(k) ? `ctrl+${k.toLowerCase()}` : '';
  }
  if (e.altKey) return '';
  if (k === 'Tab') return e.shiftKey ? '' : 'tab';
  if (k === 'Enter') return 'enter';
  if (/^[a-z]$/i.test(k)) return e.shiftKey || k !== k.toLowerCase() ? `shift+${k.toLowerCase()}` : k;
  const dg = /^Digit(\d)$/.exec(e.code ?? '') ?? /^Numpad(\d)$/.exec(e.code ?? '');
  if (dg) return e.shiftKey ? `shift+${dg[1]}` : dg[1];
  if (/^\d$/.test(k)) return k;
  return SYMBOLS5.has(k) ? k : '';
}

/** Como mostrar a tecla ao jogador ('shift+3' → '⇧3', 'ctrl+k' → 'Ctrl K'). */
export function chordLabel5(c: string): string {
  if (c.startsWith('shift+')) return `⇧${c.slice(6).toUpperCase()}`;
  if (c === 'ctrl+enter') return 'Ctrl Enter';
  if (c.startsWith('ctrl+')) return `Ctrl ${c.slice(5).toUpperCase()}`;
  if (c === 'escape') return 'Esc';
  if (c === 'tab') return 'Tab';
  if (c === 'alt') return 'Alt';
  if (c === 'enter') return 'Enter';
  return c.toUpperCase();
}

// ---------------------------------------------------------------- registro (fonte única)

const BINDS5 = new Map<string, Bind5>();

/** Registra (ou substitui, pelo id) uma ligação de tecla. Objetos registram a sua em `registerObject5`. */
export function registerKey5(b: Bind5): void {
  if (!validChord5(b.chord)) throw new Error(`keys5: tecla inválida "${b.chord}" em ${b.id}`);
  BINDS5.set(b.id, b);
}
export const keys5 = (): Bind5[] => [...BINDS5.values()];
export const key5 = (id: string): Bind5 | undefined => BINDS5.get(id);

const sys = (id: Sys5, chord: string, label: L, legacy?: string, fixed = true): Bind5 => ({ id: `sys:${id}`, chord, act: { kind: 'sys', id }, label, scope: 'global', fixed, legacy });
const travel = (id: Region5, chord: string, label: L, legacy?: string): Bind5 => ({ id: `travel:${id}`, chord, act: { kind: 'travel', id }, label, scope: 'global', legacy });
const mark = (area: string, chord: string, obj: string, label: L, tab?: [string, string]): Bind5 => ({ id: `mark:${area}${tab ? `/${tab[1]}` : ''}`, chord, act: { kind: 'marker', obj, area, tab }, label, scope: 'global', legacy: chord });
const local = (scope: string, id: string, chord: string, label: L): Bind5 => ({ id: `${scope}:${id}`, chord, act: { kind: 'local', id }, label, scope, fixed: true, legacy: chord });

/** Sistema, viagem, marcadores e teclas internas de papéis. As teclas dos objetos vêm de objects5.ts. */
export const BASE_KEYS5: Bind5[] = [
  // sistema (iguais às de hoje, menos Esc e Alt, que ganham função)
  sys('search', 'ctrl+k', l('Buscar (pessoas, selos, obras, "quero…")', 'Search (people, labels, works, "I want…")'), 'ctrl+k'),
  sys('search2', '/', l('Buscar (atalho curto)', 'Search (short)'), '/'),
  sys('advance', 'ctrl+enter', l('Avançar mês', 'Advance month'), 'ctrl+enter'),
  sys('keys', '?', l('Lista de teclas', 'Key list'), '?'),
  sys('prevTab', '{', l('Marcador anterior do papel aberto', 'Previous marker of the open paper'), '{'),
  sys('nextTab', '}', l('Próximo marcador do papel aberto', 'Next marker of the open paper'), '}'),
  sys('pause', 'escape', l('Fecha o papel aberto; sem papel aberto, abre o menu de pausa', 'Closes the open paper; with none open, opens the pause menu')),
  sys('names', 'alt', l('Segurar: mostra o nome e a tecla de todos os objetos', 'Hold: shows every object\'s name and key')),
  sys('houses', 'tab', l('Troca de casa (várias carreiras ativas)', 'Switch house (several active careers)')),
  { id: 'sys:home', chord: 'h', act: { kind: 'travel', id: 'sede' }, label: l('Volta à sede de qualquer lugar', 'Back to the HQ from anywhere'), scope: 'global' },
  // viagem (barra fixa: Sede, Casa, Cidade, Mundo)
  travel('sede', 'shift+1', l('Viagem: Sede', 'Travel: HQ'), 'shift+2'),
  travel('casa', 'shift+2', l('Viagem: Casa', 'Travel: Home'), 'shift+5'),
  travel('cidade', 'shift+3', l('Viagem: Cidade', 'Travel: City'), 'shift+3'),
  travel('mundo', 'shift+4', l('Viagem: Mundo', 'Travel: World'), 'shift+4'),
  // teclas de marcador: atalhos de hoje de páginas que viraram marcador de um objeto (continuam valendo)
  mark('people', 'p', 'mural', l('Mural do elenco › Pessoas', 'Roster board › People')),
  mark('critics', 'q', 'jornal', l('Jornal › Críticos', 'Newspaper › Critics')),
  mark('rockhall', 'r', 'trofeus', l('Estante de troféus › Hall da fama', 'Trophy shelf › Hall of fame')),
  mark('company', '0', 'quadrofunc', l('Quadro de funcionários › Empresa', 'Staff board › Company')),
  mark('creation', '8', 'mesasom', l('Mesa de som › Criação', 'Mixing desk › Creation')),
  // teclas internas da caixa de entrada de hoje (src/ui/sys/inbox27.ts; valem só com ela aberta e ganham das globais)
  local('correspondencia', 'next', 'j', l('Próxima mensagem', 'Next message')),
  local('correspondencia', 'prev', 'k', l('Mensagem anterior', 'Previous message')),
  local('correspondencia', 'open', 'enter', l('Abrir a mensagem', 'Open the message')),
  local('correspondencia', 'archive', 'e', l('Arquivar', 'Archive')),
  local('correspondencia', 'star', 's', l('Marcar com estrela', 'Star')),
  local('correspondencia', 'close', 'escape', l('Fechar a caixa', 'Close the inbox')),
];
for (const b of BASE_KEYS5) registerKey5(b);

// ---------------------------------------------------------------- conflitos e personalização

/** Teclas que o jogador não pode usar para outra coisa (sistema e navegador). */
export const RESERVED5 = new Set(['ctrl+k', 'ctrl+enter', '?', '/', '{', '}', 'escape', 'alt', 'tab', 'enter']);

export interface Conflict5 { chord: string; scope: string; ids: string[] }
/** Duas ligações com a mesma tecla no mesmo escopo. Escopo de papel × global não é conflito (o papel ganha enquanto
 *  está aberto); duas globais iguais, ou duas do mesmo papel, são. */
export function conflicts5(list: readonly Bind5[] = keys5()): Conflict5[] {
  const by = new Map<string, string[]>();
  for (const b of list) {
    const k = `${b.scope}|${b.chord}`;
    by.set(k, [...(by.get(k) ?? []), b.id]);
  }
  return [...by.entries()].filter(([, ids]) => ids.length > 1).map(([k, ids]) => { const i = k.indexOf('|'); return { scope: k.slice(0, i), chord: k.slice(i + 1), ids }; });
}

/** Motivo para recusar trocar a tecla `id` para `chord` (undefined = pode). */
export function checkRebind5(id: string, chord: string, list: readonly Bind5[] = keys5()): L | undefined {
  const b = list.find((x) => x.id === id);
  if (!b) return l('Essa função não existe.', 'That function does not exist.');
  if (b.fixed) return l('Essa tecla é do sistema e não muda.', 'That key belongs to the system and cannot change.');
  if (!validChord5(chord) || chord.startsWith('ctrl+')) return l('Use uma letra, um dígito, Shift + letra/dígito ou um símbolo.', 'Use a letter, a digit, Shift + letter/digit or a symbol.');
  if (RESERVED5.has(chord)) return l('Essa tecla é reservada (busca, teclas, marcadores, pausa).', 'That key is reserved (search, keys, markers, pause).');
  const other = list.find((x) => x.id !== id && x.chord === chord && (x.scope === b.scope || (x.scope === 'global' && b.scope === 'global')));
  if (other) return { pt: `Essa tecla já abre "${other.label.pt}".`, en: `That key already opens "${other.label.en}".` };
  return undefined;
}

/** Teclas personalizadas do jogador (id → tecla). Guardadas fora do mundo (preferência), aplicadas por cima do padrão. */
export type Custom5 = Record<string, string>;

/** Aplica as personalizações em ordem; a que daria conflito (ou é inválida) é ignorada e devolvida em `rejected`. */
export function applyCustom5(custom: Custom5, base: readonly Bind5[] = keys5()): { binds: Bind5[]; rejected: { id: string; chord: string; why: L }[] } {
  let binds = base.map((b) => ({ ...b }));
  const rejected: { id: string; chord: string; why: L }[] = [];
  for (const [id, chord] of Object.entries(custom)) {
    const why = checkRebind5(id, chord, binds);
    if (why) { rejected.push({ id, chord, why }); continue; }
    binds = binds.map((b) => (b.id === id ? { ...b, chord } : b));
  }
  return { binds, rejected };
}

/** Ligação que a tecla dispara agora (papel aberto ganha das globais). */
export function bindOf5(chord: string, paper?: string, list: readonly Bind5[] = keys5()): Bind5 | undefined {
  if (!chord) return undefined;
  return (paper ? list.find((b) => b.scope === paper && b.chord === chord) : undefined) ?? list.find((b) => b.scope === 'global' && b.chord === chord);
}

// ---------------------------------------------------------------- o que mudou (para quem já joga)

export interface Change5 { chord: string; before: L; after: L; why: L }
/** Toda tecla que muda de função com `exp5.nav` ligado (o resto continua igual). */
export const KEY_CHANGES5: Change5[] = [
  { chord: 'e', before: l('Outras carreiras', 'Other careers'), after: l('Caixa de entrada (correspondência da época)', 'Inbox (the era\'s mail)'),
    why: l('Pedido do dono: E = caixa de entrada. "Outras carreiras" virou marcador do escritório em casa (tecla N).', 'Owner\'s request: E = inbox. "Other careers" became a marker of the home office (key N).') },
  { chord: 'g', before: l('Página de empresário', 'Manager page'), after: l('Agenda de couro (agenda, calendário, shows marcados)', 'Leather planner (schedule, calendar, booked shows)'),
    why: l('Os mocks tinham G = telefone; o pedido fixou G = agenda. A página de empresário foi para Shift+G; o telefone ficou com Shift+T.', 'The mocks had G = phone; the request set G = planner. The manager page moved to Shift+G; the phone got Shift+T.') },
  { chord: 'h', before: l('Lendas', 'Legends'), after: l('Volta à sede de qualquer lugar', 'Back to the HQ from anywhere'),
    why: l('Regra 8 do mapa: H volta à sede. Lendas virou marcador do livro "Cultura" (tecla M).', 'Map rule 8: H goes back to the HQ. Legends became a marker of the "Culture" book (key M).') },
  { chord: 'c', before: l('Compromissos', 'Commitments'), after: l('Quadro de planejamento (a mesma página, com o elenco por mês)', 'Planning board (same page, roster by month)'),
    why: l('Mesma página, objeto novo: nos mocks C era o calendário; o calendário virou a agenda (G) e C abre o quadro de planejamento.', 'Same page, new object: in the mocks C was the calendar; the calendar became the planner (G) and C opens the planning board.') },
  { chord: 'shift+1', before: l('Menu: Hoje', 'Menu: Today'), after: l('Viagem: Sede', 'Travel: HQ'),
    why: l('Botões de viagem Sede, Casa, Cidade, Mundo em Shift+1…4. "Hoje" virou a mesa do mês (tecla 1).', 'Travel buttons HQ, Home, City, World on Shift+1…4. "Today" became the monthly desk (key 1).') },
  { chord: 'shift+2', before: l('Menu: Sede', 'Menu: HQ'), after: l('Viagem: Casa', 'Travel: Home'),
    why: l('"Você" virou a sua casa (EXP-6) e entra no segundo botão de viagem.', '"You" became your home (EXP-6) and is the second travel button.') },
  { chord: 'shift+5', before: l('Menu: Você', 'Menu: You'), after: l('Pilha de demos (talentos)', 'Demo pile (talent)'),
    why: l('Você agora é Shift+2 (Casa). Shift+dígito livre vira "irmão" do objeto do dígito: 5 olheiro, Shift+5 demos.', 'You is now Shift+2 (Home). A free Shift+digit becomes a "sibling" of the digit\'s object: 5 scout, Shift+5 demos.') },
  { chord: 'shift+6', before: l('Menu: Listas', 'Menu: Lists'), after: l('(livre)', '(free)'),
    why: l('Listas some (o índice completo fica no menu de pausa).', 'Lists goes away (the full index stays in the pause menu).') },
  { chord: 'escape', before: l('Fecha janelas', 'Closes windows'), after: l('Fecha o papel aberto; sem nada aberto, menu de pausa', 'Closes the open paper; with nothing open, pause menu'),
    why: l('Pausa com salvar, opções, ajuda, editor e índice (mock da pausa).', 'Pause with save, options, help, editor and index (pause mock).') },
  { chord: 'alt', before: l('(sem uso)', '(unused)'), after: l('Segurar mostra nomes e teclas dos objetos', 'Hold to show object names and keys'),
    why: l('Rótulos só ao passar o mouse ou com Alt (decisão do dono sobre os mocks).', 'Labels only on hover or with Alt (owner\'s decision on the mocks).') },
  { chord: '⇧A … ⇧Z', before: l('Mesma página da letra minúscula', 'Same page as the lowercase letter'), after: l('Objetos sem tecla antes (arquivo de aço, telefone, bar, aeroporto…)', 'Objects that had no key (steel cabinet, phone, bar, airport…)'),
    why: l('Hoje Shift+letra repete a letra; na onda 5 é a segunda camada, para dar tecla a todo objeto sem tirar nenhuma das atuais.', 'Today Shift+letter repeats the letter; in wave 5 it is the second layer, giving every object a key without removing any current one.') },
];
