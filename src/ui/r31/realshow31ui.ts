// R31 · onda 4 (X) — interface do interruptor "Nomes e obras reais" (Opções) e o gancho do texto pintado nas cenas
// (canvas). A troca é só na exibição (src/sim/r31/realshow31.ts); a Nova partida continua escolhendo com que nomes o
// mundo nasce (seletor de mundo).
import { disp31 } from '../../data/realdisp31';
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { realShown31, setRealShown31 } from '../../sim/r31/realshow31';
import { rerender } from '../common';
import { h } from '../dom';
import { store } from '../store';

/** Texto pintado em canvas (cenas, letreiros, logotipos) passa pelo mesmo filtro. Instalado uma vez. */
let installed31 = false;
export function installCanvasNames31(): void {
  if (installed31 || typeof CanvasRenderingContext2D === 'undefined') return;
  installed31 = true;
  const P = CanvasRenderingContext2D.prototype;
  const fill = P.fillText, stroke = P.strokeText;
  P.fillText = function (this: CanvasRenderingContext2D, text: string, x: number, y: number, w?: number) { return w === undefined ? fill.call(this, disp31(String(text)), x, y) : fill.call(this, disp31(String(text)), x, y, w); };
  P.strokeText = function (this: CanvasRenderingContext2D, text: string, x: number, y: number, w?: number) { return w === undefined ? stroke.call(this, disp31(String(text)), x, y) : stroke.call(this, disp31(String(text)), x, y, w); };
}
installCanvasNames31();

/** Linha das Opções (dentro da partida). */
export function settingsRealNames31(): HTMLElement | null {
  const s = store.game;
  if (!s) return null;
  return h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: realShown31(s), onchange: (e: Event) => { setRealShown31(s, (e.target as HTMLInputElement).checked); rerender(); } }),
    ' ', t(l('Nomes e obras reais: ligado mostra artistas, músicas, marcas, festivais, prêmios, veículos, bandas de ficção e referências com o nome real; desligado, tudo vira homenagem parecida. Só muda o que aparece na tela (o save e a simulação ficam iguais). A família Fossati aparece sempre com o nome real.',
      'Real names and works: on shows artists, songs, brands, festivals, awards, outlets, fiction bands and references by their real names; off, everything becomes a similar tribute. Only what is shown changes (the save and the simulation stay the same). The Fossati family always appears under its real name.')));
}
