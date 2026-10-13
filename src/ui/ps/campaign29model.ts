// Rodada 29 (REORG, M30 + S17 da Bíblia de UI/UX) — o PASSAPORTE DA CAMPANHA, função pura do estado (sem DOM).
// Uma ficha que corresponde ao estado real: versão do save, data da campanha, papéis, dificuldade, política histórica,
// semente, início/fim (ou sandbox) e compatibilidade. Separa as três dimensões da Parte II (G01):
//   'rules'  = regras e mundo em vigor (gravadas na partida; mudar exige outra run ou migração explícita);
//   'self'   = identidade (personagem, empresa, carreiras);
//   'view'   = apresentação (preferências deste navegador: NÃO mudam regra, RNG nem informação disponível).
// Nada aqui escreve no estado; desconhecido aparece como "não registrado", nunca como zero.

import { l, type L } from '../../data/world';
import { endOf28 } from '../../sim/start28data';
import type { GameState } from '../../sim/types';
import { MIN_SAVE_VERSION, SAVE_VERSION } from '../../sim/worldgen';

export type PassKind29 = 'rules' | 'self' | 'view' | 'save';
export interface PassRow29 { id: string; kind: PassKind29; label: L; value: L | string; note?: L }

const UNK: L = l('não registrado nesta partida', 'not recorded in this run');
const yes = (b: boolean | undefined): L => (b ? l('sim', 'yes') : l('não', 'no'));
const DIFF: Record<string, L> = { easy: l('fácil', 'easy'), normal: l('normal', 'normal'), hard: l('difícil', 'hard') };
const HIST: Record<string, L> = { strict: l('exata (como foi)', 'strict (as it was)'), loose: l('com variações', 'loose'), free: l('livre/aleatória', 'free/random') };
const POLICY: Record<string, L> = { historical: l('histórico até o início', 'historical up to the start'), simulated: l('simulado antes do início', 'simulated before the start') };

/** Preferências de apresentação relevantes (vêm da interface; ausentes = padrão). */
export interface ViewPrefs29 { menuView?: string; textScale?: number; density?: string; reducedMotion?: boolean; contrast?: boolean; audio?: boolean; cutscenes?: boolean }

/** O passaporte inteiro, na ordem: save → regras → identidade → apresentação. */
export function passport29(s: GameState, view: ViewPrefs29 = {}): PassRow29[] {
  const c = s.config;
  const end = endOf28(c.startYear, c.runYears17);
  const careers = c.careers?.main?.length ? c.careers.main.join(', ') : c.role;
  const sv = s.version ?? 0;
  const rows: PassRow29[] = [
    { id: 'saveVersion', kind: 'save', label: l('Esquema do save', 'Save schema'), value: l(`v${sv} (atual ${SAVE_VERSION} · mínimo ${MIN_SAVE_VERSION})`, `v${sv} (current ${SAVE_VERSION} · minimum ${MIN_SAVE_VERSION})`),
      note: sv >= MIN_SAVE_VERSION ? l('Compatível com esta versão do jogo.', 'Compatible with this game version.') : l('Anterior ao mínimo: guarde o arquivo e abra na versão do jogo em que foi criado (não apague).', 'Older than the minimum: keep the file and open it in the game version that made it (do not delete).') },
    { id: 'rng', kind: 'save', label: l('Sorteio (RNG)', 'Randomness (RNG)'), value: s.rngVersion ? l(`v${s.rngVersion} · um fluxo por sistema`, `v${s.rngVersion} · one stream per system`) : l('fluxo único (save antigo)', 'single stream (old save)') },
    { id: 'date', kind: 'save', label: l('Data da campanha', 'Campaign date'), value: l(`${String(s.month + 1).padStart(2, '0')}/${s.year} · semana ${s.week}`, `${String(s.month + 1).padStart(2, '0')}/${s.year} · week ${s.week}`) },
    { id: 'seed', kind: 'rules', label: l('Semente', 'Seed'), value: c.seed || UNK, note: l('Mesma semente + mesma configuração + mesma versão = mesmo começo.', 'Same seed + same setup + same version = same start.') },
    { id: 'span', kind: 'rules', label: l('Início e fim', 'Start and end'), value: end === null ? l(`${c.startYear} → sem fim (sandbox)`, `${c.startYear} → no end (sandbox)`) : l(`${c.startYear} → dez/${end}`, `${c.startYear} → Dec/${end}`),
      note: end === null ? undefined : l('Ao chegar no fim: storyboard, pontuação e opção de continuar em sandbox.', 'At the end: storyboard, score and the option to keep playing in sandbox.') },
    { id: 'difficulty', kind: 'rules', label: l('Dificuldade', 'Difficulty'), value: DIFF[c.difficulty] ?? c.difficulty,
      note: c.diff17 && Object.keys(c.diff17).length ? l(`detalhe: ${Object.entries(c.diff17).map(([k, v]) => `${k} ${v! > 0 ? '+' : ''}${v}`).join(', ')}`, `detail: ${Object.entries(c.diff17).map(([k, v]) => `${k} ${v! > 0 ? '+' : ''}${v}`).join(', ')}`) : undefined },
    { id: 'history', kind: 'rules', label: l('Política histórica', 'History policy'), value: c.history ? HIST[c.history] ?? c.history : l('padrão (com variações)', 'default (loose)') },
    { id: 'world', kind: 'rules', label: l('Mundo inicial', 'Initial world'), value: c.initialWorldPolicy ? POLICY[c.initialWorldPolicy] : (c.world17 ?? UNK) },
    { id: 'realNames', kind: 'rules', label: l('Nomes reais', 'Real names'), value: yes(c.realNames) },
    { id: 'ironman', kind: 'rules', label: l('Ironman (um save só)', 'Ironman (single save)'), value: yes(c.ironman) },
    { id: 'assist', kind: 'rules', label: l('Modo história (assistido)', 'Story mode (assisted)'), value: yes(c.assist28) },
    { id: 'mutators', kind: 'rules', label: l('Modificadores', 'Mutators'), value: c.mutators?.length ? c.mutators.join(', ') : l('nenhum', 'none') },
    { id: 'filters', kind: 'rules', label: l('Filtros de conteúdo', 'Content filters'), value: c.contentFilters?.length ? c.contentFilters.join(', ') : l('nenhum', 'none') },
    { id: 'storyteller', kind: 'rules', label: l('Narrador', 'Storyteller'), value: c.storyteller ?? UNK },
    { id: 'company', kind: 'self', label: l('Empresa', 'Company'), value: c.companyName || UNK },
    { id: 'character', kind: 'self', label: l('Personagem', 'Character'), value: c.character?.name ?? l('gerado', 'generated') },
    { id: 'careers', kind: 'self', label: l('Carreiras', 'Careers'), value: careers },
    { id: 'city', kind: 'self', label: l('Cidade-sede', 'Home city'), value: c.homeCity || UNK },
    { id: 'menuView', kind: 'view', label: l('Vista do menu', 'Menu view'), value: view.menuView === 'full' ? l('Completa', 'Complete') : l('Essencial', 'Essential') },
    { id: 'text', kind: 'view', label: l('Tamanho do texto', 'Text size'), value: `${view.textScale ?? 100}%` },
    { id: 'density', kind: 'view', label: l('Densidade', 'Density'), value: view.density === 'compact' ? l('compacta', 'compact') : l('confortável', 'comfortable') },
    { id: 'motion', kind: 'view', label: l('Movimento reduzido', 'Reduced motion'), value: yes(view.reducedMotion) },
    { id: 'audio', kind: 'view', label: l('Áudio', 'Audio'), value: view.audio ? l('ligado', 'on') : l('desligado (opt-in)', 'off (opt-in)') },
  ];
  return rows;
}

export const PASS_KIND_L29: Record<PassKind29, L> = {
  save: l('Save e compatibilidade', 'Save and compatibility'),
  rules: l('Regras e mundo (gravados na partida)', 'Rules and world (stored in the run)'),
  self: l('Identidade', 'Identity'),
  view: l('Apresentação (só neste navegador; não muda regras)', 'Presentation (this browser only; does not change rules)'),
};
