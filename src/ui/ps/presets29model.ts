// Rodada 29 (REORG, M20 da Bíblia de UI/UX) — presets de APRESENTAÇÃO: Guiado / Livre / Contemplativo. Puro (sem DOM).
// Mexem só em preferências deste navegador: densidade, dicas/tutoriais, o que interrompe, ritmo das atividades e das
// cenas, aviso antes de avançar e a vista do menu. NUNCA em regras, chances, custos, dificuldade, modo história
// (assist28), política histórica ou som (opt-in continua do jeito que você deixou). Nada disso vai para o save.

import { l, type L } from '../../data/world';

export type PresetId29 = 'guided' | 'free' | 'calm';
/** As chaves que um preset pode tocar (lista fechada — testada). */
export const PRESET_KEYS29 = ['dens20', 'noTut19', 'interrupt23', 'activities27', 'act27', 'cut27', 'cutscenes', 'ask19', 'menuView'] as const;
export type PresetKey29 = (typeof PRESET_KEYS29)[number];
export type PresetPrefs29 = Partial<Record<PresetKey29, string | boolean>>;

export interface Preset29 { id: PresetId29; name: L; desc: L; set: PresetPrefs29 }
export const PRESETS29: Preset29[] = [
  { id: 'guided', name: l('Guiado', 'Guided'), desc: l('Destaca próximos passos: dicas ligadas, tudo interrompe, atividades jogáveis, aviso antes de avançar, menu Essencial.', 'Highlights next steps: tips on, everything interrupts, playable activities, warning before advancing, Essential menu.'),
    set: { dens20: 'comfy', noTut19: false, interrupt23: 'all', activities27: 'play', act27: 'play', cut27: 'all', cutscenes: true, ask19: true, menuView: 'simple' } },
  { id: 'free', name: l('Livre', 'Free'), desc: l('Acompanhamento amplo e pouca interrupção: densidade compacta, sem dicas, só decisões interrompem, menu Completo.', 'Wide overview, few interruptions: compact density, no tips, only decisions interrupt, Complete menu.'),
    set: { dens20: 'compact', noTut19: true, interrupt23: 'decisions', activities27: 'key', act27: 'important', cut27: 'major', cutscenes: true, ask19: false, menuView: 'full' } },
  { id: 'calm', name: l('Contemplativo', 'Contemplative'), desc: l('Prioriza as cenas e os marcos; a gestão fica disponível, mas as atividades resolvem rápido.', 'Puts scenes and milestones first; management stays available, but activities resolve quickly.'),
    set: { dens20: 'comfy', noTut19: true, interrupt23: 'milestones', activities27: 'quick', act27: 'quick', cut27: 'all', cutscenes: true, ask19: true, menuView: 'simple' } },
];
export const preset29 = (id: string): Preset29 | undefined => PRESETS29.find((x) => x.id === id);

export const KEY_L29: Record<PresetKey29, L> = {
  dens20: l('Densidade', 'Density'), noTut19: l('Sem tutoriais', 'No tutorials'), interrupt23: l('Interrupções', 'Interruptions'),
  activities27: l('Atividades jogáveis', 'Playable activities'), act27: l('Telas de atividade', 'Activity screens'), cut27: l('Cenas animadas', 'Animated scenes'),
  cutscenes: l('Cenas ao avançar', 'Scenes when advancing'), ask19: l('Avisar antes de avançar', 'Warn before advancing'), menuView: l('Vista do menu', 'Menu view'),
};

/** O que mudaria (antes → depois), só nas chaves do preset que de fato mudam. Consulta: não altera nada. */
export function presetDiff29(cur: PresetPrefs29, id: PresetId29): { key: PresetKey29; from: string; to: string }[] {
  const p = preset29(id);
  if (!p) return [];
  return PRESET_KEYS29.filter((k) => p.set[k] !== undefined && String(cur[k] ?? '') !== String(p.set[k])).map((k) => ({ key: k, from: String(cur[k] ?? '—'), to: String(p.set[k]) }));
}
/** Novas preferências (cópia) com o preset aplicado; chaves fora da lista ficam como estavam. */
export function applyPreset29<T extends PresetPrefs29>(cur: T, id: PresetId29): T {
  const p = preset29(id);
  return p ? { ...cur, ...p.set } : { ...cur };
}
/** Qual preset as preferências atuais correspondem (ou 'custom'). */
export function detectPreset29(cur: PresetPrefs29): PresetId29 | 'custom' {
  return PRESETS29.find((p) => PRESET_KEYS29.every((k) => p.set[k] === undefined || String(cur[k] ?? '') === String(p.set[k])))?.id ?? 'custom';
}

/** Nomes legíveis dos valores (a prévia nunca mostra o id interno). */
export const VAL_L29: Record<string, L> = {
  comfy: l('confortável', 'comfortable'), compact: l('compacta', 'compact'),
  all: l('tudo', 'everything'), decisions: l('só decisões', 'decisions only'), milestones: l('decisões e marcos', 'decisions and milestones'),
  play: l('jogáveis', 'playable'), key: l('só as importantes', 'key ones only'), important: l('só as importantes', 'key ones only'), quick: l('sempre rápido', 'always quick'),
  major: l('só as grandes', 'major only'), off: l('desligadas', 'off'), true: l('sim', 'yes'), false: l('não', 'no'),
  simple: l('Essencial', 'Essential'), full: l('Completa', 'Complete'), '—': l('padrão', 'default'),
};
export const valL29 = (v: string): L => VAL_L29[v] ?? l(v, v);
