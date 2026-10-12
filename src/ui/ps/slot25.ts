// r25: ponto de encaixe da tela inicial da Sede (Pixel Studio). null → página antiga do cockpit.
export let sedeHome25: ((root: HTMLElement) => void) | null = null;
export function setSedeHome25(f: (root: HTMLElement) => void): void { sedeHome25 = f; }
