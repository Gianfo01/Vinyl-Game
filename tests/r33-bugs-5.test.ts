// BUGS33 · item 5 — tela cheia: Alt+Enter entra na lista de teclas como tecla do sistema (fixa, reservada, sem
// conflito) e não vira tecla de objeto. (A tela cheia em si é conferida no navegador: docs/r33/bugs/5-*.)
import { describe, expect, it } from 'vitest';
import { bindOf5, checkRebind5, chordLabel5, conflicts5, key5, validChord5 } from '../src/ui/r31/keys5';
import '../src/ui/r31/objects5';

describe('BUGS33 · tela cheia', () => {
  it('Alt+Enter: tecla do sistema, fixa e reservada', () => {
    expect(validChord5('alt+enter')).toBe(true);
    expect(key5('sys:fullscreen')).toMatchObject({ chord: 'alt+enter', fixed: true });
    expect(chordLabel5('alt+enter')).toBe('Alt Enter');
    expect(bindOf5('alt+enter')!.id).toBe('sys:fullscreen');
    expect(checkRebind5('obj:telefone', 'alt+enter')).toBeTruthy();
    expect(conflicts5()).toEqual([]);
  });
});
