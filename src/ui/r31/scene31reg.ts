// R31 · onda 2 (V) — registro das cenas de mecânica no editor (regra 10) e no painel rápido (⚡ / Ctrl+K).
// Sem DOM ao carregar: quem abre a cena de fato é ui/r31/scene31.ts, que preenche `sceneHook31.open`.

import { l } from '../../data/world';
import { registerRunnable } from '../../sim/r31/editor';
import { playerActs } from '../../sim/util';
import { registerQuick31 } from './quick31core';
import { sceneLabel31, sceneModel31, sceneTargets31, SCENE_KINDS31, type SceneKind31 } from './scene31core';

/** Preenchido pela interface: abre a cena (ou o modo de 2 cliques, conforme a preferência). `force` = sempre a cena. */
export const sceneHook31: {
  open?: (kind: SceneKind31, id: string, force?: 'scene' | 'quick') => void;
  or?: (kind: SceneKind31, id: string, direct?: () => void) => void;
} = {};

/** Para os botões de sempre (formulários): passa pela cena quando a preferência pede; senão o caminho direto
 *  (`direct`, a velocidade da versão 30) ou, sem ele, o painel de 2 cliques. Sem interface carregada: direto. */
export function viaScene31(kind: SceneKind31, id: string, direct?: () => void): void {
  if (sceneHook31.or) sceneHook31.or(kind, id, direct); else direct?.();
}

// ---------------------------------------------------------------- editor: "Abrir cena: …" (área Cenas)
for (const kind of SCENE_KINDS31) {
  registerRunnable({
    id: `scene31.${kind}`, area: 'scenes', label: l(`Abrir cena: ${sceneLabel31(kind).pt}`, `Open scene: ${sceneLabel31(kind).en}`),
    help: l('Abre a cena em pixel art (não decide nada: a decisão continua sendo sua, na cena).', 'Opens the pixel-art scene (decides nothing: the decision is still yours, in the scene).'),
    arg: { kind: 'select', label: l('Com quem', 'With whom'), options: (s) => sceneTargets31(s, kind).map((x) => ({ value: x.id, label: l(x.name, x.name) })) },
    run: (s, _t, arg) => {
      const id = String(arg ?? '') || sceneTargets31(s, kind)[0]?.id;
      if (!id || !sceneModel31(s, kind, { id })) return { ok: false, text: l('Ninguém disponível para esta cena agora.', 'Nobody available for this scene right now.') };
      if (sceneHook31.open) setTimeout(() => sceneHook31.open?.(kind, id, 'scene'), 0);
      return l('Cena aberta.', 'Scene opened.');
    },
  });
}

// ---------------------------------------------------------------- painel rápido (⚡ e busca "renovar X", "rescindir X"…)
const mine = (s: Parameters<typeof playerActs>[0], id: string) => playerActs(s).includes(id);
const quick = (id: string, kind: SceneKind31, verb: 'renew' | 'rescind' | 'lineup', icon: string) => registerQuick31({
  id, verb, icon, kinds: ['act'], label: sceneLabel31(kind),
  applies: (s, t) => mine(s, t.id) && !!sceneModel31(s, kind, { id: t.id }),
  lock: (s, t) => { const m = sceneModel31(s, kind, { id: t.id }); return m?.lock ?? (m && m.choices.length && m.choices.every((c) => c.lock) ? m.choices[0].lock : null); },
  cost: (s, t) => sceneModel31(s, kind, { id: t.id })?.choices[0]?.cost ?? 0,
  dest: (_s, t) => ({ area: 'artists', actId: t.id, intent: `scene31:${kind}` }),
  run: (_s, t) => sceneHook31.open?.(kind, t.id),
});
quick('q.renew', 'renew', 'renew', 'quill');
quick('q.rescind', 'rescind', 'rescind', 'broken-heart');
quick('q.lineup', 'lineup', 'lineup', 'people');
