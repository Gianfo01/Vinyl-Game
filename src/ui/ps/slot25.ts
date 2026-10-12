// Rodada 25 — Pixel Studio: ponto de encaixe da tela da Sede (sem dependências: evita ciclos).
// Quem constrói a cena da sede chama setSedeHome25(fn) ao carregar o módulo; a seção "Sede" passa a abrir
// nessa tela (área virtual 'sede25', rótulo "Sua sede"). Sem tela registrada (null), a Sede abre no Cockpit.
//
// Uso:
//   import { setSedeHome25, sedeNav25 } from './slot25';
//   setSedeHome25((root) => { root.append(minhaCena()); });
//   // dentro da cena: sedeNav25.go('studio') abre outra página; sedeNav25.rerender() redesenha.
//
// `root` é um <div class="sede25"> novo a cada desenho (o jogo está em store.game). O título grande automático
// ("Sua sede") some se a cena trouxer o próprio elemento com a classe `page21` (ex.: <h1 class="page21">).

export type SedeHome25 = (root: HTMLElement) => void;

export let sedeHome25: SedeHome25 | null = null;

/** Registra (ou remove, com null) a tela da Sede. Redesenha se a partida já estiver aberta. */
export function setSedeHome25(f: SedeHome25 | null): void {
  sedeHome25 = f;
  sedeNav25.rerender();
}

/** Navegação para a cena da Sede (app.ts preenche no boot). */
export const sedeNav25: { go: (area: string) => void; rerender: () => void } = { go: () => {}, rerender: () => {} };
