// R31 (X) — palavras da interface que coincidem com nomes reais: o interruptor "Nomes e obras reais" troca só o nome
// da gravadora/ato/obra, nunca o rótulo da interface. A gravadora real "Elenco" vira "Sol Maior Discos"; a aba e o
// departamento "Elenco" (Roster) continuam "Elenco".
import { afterEach, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { disp31, plain31, setDisplay31 } from '../src/data/realdisp31';
import { l } from '../src/data/world';
import { getLang, setLang, t } from '../src/i18n/strings';
import { DEPT31 } from '../src/sim/deleg31';
import { realPairsOff31, setRealShown31 } from '../src/sim/r31/realshow31';

// o h() passa todo texto pelo disp31 de novo: o que a tela mostra é disp31(t(...))
const shown = (s: string) => disp31(s);
const withPt = <T>(f: () => T): T => {
  const prev = getLang();
  (globalThis as { document?: unknown }).document ??= { documentElement: {} };
  setLang('pt');
  try { return f(); } finally { setLang(prev); }
};

describe('X · palavras da interface não viram homenagem', () => {
  afterEach(() => setDisplay31([], []));

  it('tabela estática: "Elenco" da interface fica, a gravadora Elenco troca', () => {
    const p = realPairsOff31();
    setDisplay31(p.names, p.titles);
    withPt(() => {
      // rótulo da interface (departamento da Delegação e aba de Pessoas)
      expect(shown(t(DEPT31.cast.name))).toBe('Elenco');
      expect(shown(t(l('Elenco', 'Roster')))).toBe('Elenco');
      expect(plain31(disp31('Elenco', true))).toBe('Elenco');
      expect(shown(t(l('Elenco ({n})', 'Roster ({n})'), { n: 3 }))).toBe('Elenco (3)');
      expect(shown(`${t(l('Elenco', 'Roster'))}: 4`)).toBe('Elenco: 4');
      expect(shown('Elenco vazio: contrate o primeiro artista')).toBe('Elenco vazio: contrate o primeiro artista');
      expect(shown(t(l('Telefone', 'Phone')))).toBe('Telefone');
      // nome da gravadora (texto vindo do estado, ou parâmetro de um modelo)
      expect(disp31('Elenco')).toBe('Sol Maior Discos');
      expect(shown(t(l('{x}', '{x}'), { x: 'Elenco' }))).toBe('Sol Maior Discos');
      expect(disp31('“Elenco”')).toBe('“Sol Maior Discos”');
    });
  });

  it('palavras comuns não são trocadas no meio da frase', () => {
    const p = realPairsOff31();
    setDisplay31(p.names, p.titles);
    for (const s of ['Jul 1965', 'Vinyl sales are up', 'City council', 'Nada a fazer', 'Menor de idade', 'Random event']) expect(disp31(s)).toBe(s);
    expect(p.names.some(([a]) => a === 'Elenco')).toBe(false);
    expect(p.titles.some(([a]) => a === 'Elenco')).toBe(true);
  });

  it('mundo com nomes reais e exibição desligada: a gravadora Elenco troca, o departamento não', () => {
    const s = createGame(defaultConfig('x31-ui', { startYear: 1975, realNames: true }));
    const lb = Object.values(s.labels).find((x) => x.name === 'Elenco');
    expect(lb).toBeTruthy();
    setRealShown31(s, false);
    withPt(() => {
      expect(shown(lb!.name)).toBe('Sol Maior Discos');
      expect(shown(t(DEPT31.cast.name))).toBe('Elenco');
    });
  });
});
