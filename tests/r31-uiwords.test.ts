// R31 (X) — palavras da interface que coincidem com nomes reais: o interruptor "Nomes e obras reais" troca só o nome
// da gravadora/ato/obra, nunca o rótulo da interface. A gravadora real "Elenco" vira "Sol Maior Discos"; a aba e o
// departamento "Elenco" (Roster) continuam "Elenco".
import { afterEach, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import fs from 'node:fs';
import { disp31, notEntity31, plain31, setDisplay31 } from '../src/data/realdisp31';
import { UI_WHOLE31 } from '../src/data/uiwords31';
import { entityOk31, render31, uiCollisions31, uiLiterals31 } from '../scripts/r31/uiwords31';
import { l } from '../src/data/world';
import { S, getLang, setLang, t } from '../src/i18n/strings';
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
    setDisplay31(p.names, p.titles, p.keep);
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
    setDisplay31(p.names, p.titles, p.keep);
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

// R31 (NOMES) — a troca vale só para nomes de entidades: rótulos da interface, palavras comuns, letras soltas, números,
// teclas e cabeçalhos passam intactos (medido na integração: "Nome" → "Noix", "Telefone" → "Teliel", "Z" → "A", "5" → "10").
describe('NOMES · só nomes de entidades trocam', () => {
  afterEach(() => setDisplay31([], []));
  const on = () => { const p = realPairsOff31(); setDisplay31(p.names, p.titles, p.keep); return p; };

  it('rótulos, letras soltas, números e teclas passam intactos (texto cru e via t())', () => {
    on();
    const raw = ['Nome', 'Telefone', 'NOME', 'Z', 'I', 'N', 'R', 'V', 'X', 'A', 'J', 'K', 'Q', 'OK', 'No', 'Up', 'Go', 'LP', 'DJ', 'F1', 'Esc',
      '5', '1984', '1999', '2001', '13', '45', '4/3/1943', '99.9%', '22:22', '1, 2, 3, 4', '( )', '+', '=', 'Status', 'Total', 'Next', 'Area',
      'Television', 'Europe', 'Respect', 'People', 'Radio', 'Debut', 'Drama', 'Livro', 'Agora', 'Luz', 'Mais', 'Nada', 'Menor', 'Fazer', 'Cargo'];
    for (const s of raw) expect(disp31(s), s).toBe(s);
    withPt(() => {
      expect(shown(t(l('Nome', 'Name')))).toBe('Nome');
      expect(shown(t(l('Telefone', 'Phone')))).toBe('Telefone');
      expect(shown(t(l('Tecla {k}', 'Key {k}'), { k: 'Z' }))).toBe('Tecla Z');
      expect(shown(t(l('{n} itens', '{n} items'), { n: 5 }))).toBe('5 itens');
      expect(shown(`${t(l('Nome', 'Name'))} ▲`)).toBe('Nome ▲');
    });
    // palavra comum no meio da frase também não troca
    for (const s of ['Fazer o quê?', 'Total: 5', 'Status do contrato', 'Next: Z']) expect(disp31(s), s).toBe(s);
  });

  it('entidades continuam trocadas: gravadora Elenco, artistas, obras e nomes em frase', () => {
    const p = on();
    expect(disp31('Elenco')).toBe('Sol Maior Discos');
    for (const n of ['The Beatles', 'Elvis Presley', 'Caetano Veloso', 'Chico Buarque', 'Taylor Swift', 'Michael Jackson']) {
      const pair = [...p.names, ...p.titles].find(([a]) => a === n);
      expect(pair, n).toBeTruthy();
      expect(disp31(n), n).toBe(pair![1]);
      expect(disp31(`Hoje, ${n} lançou um disco.`), n).toBe(`Hoje, ${pair![1]} lançou um disco.`);
    }
    // amostra grande: todo nome real de artista/obra que não é palavra da interface, número ou sigla continua trocado
    const skip = (a: string) => notEntity31(a) || UI_WHOLE31.includes(a.trim()) || /\bFossati\b|^(Efro|Lucia|Sonia|Antonella|Gianluca)$/.test(a);
    const all = [...p.names, ...p.titles].filter(([a, b]) => a !== b && !skip(a));
    const sample = all.filter((_, i) => i % 7 === 0);
    expect(sample.length).toBeGreaterThan(1500);
    const bad = sample.filter(([a]) => disp31(a) === a).map(([a]) => a);
    expect(bad).toEqual([]);
  });

  it('varredura: toda string de interface conhecida passa intacta', async () => {
    // tira só as citações de propósito (nome composto, ou de uma palavra revisado em ENTITY_OK31/registro): "o som Motown",
    // "Com B.B. King" trocam por querer; todo o resto do texto da interface tem de passar intacto
    const p = realPairsOff31(), ok = await entityOk31();
    setDisplay31(p.names.filter(([a]) => !/[^\p{L}\p{N}]/u.test(a.trim()) && !ok.has(a)), p.titles, p.keep);
    const lits = uiLiterals31();
    const keep = p.keep;
    // texto curto da interface (rótulo, cabeçalho, botão): palavra com tradução, ou chave de t() (S)
    const short = (x: string) => x.split(/\s+/).length <= 3 && !/\{\w+\}/.test(x);
    const labels = [...new Set([...lits.translated.filter(short), ...Object.values(S).flatMap((x) => [x.pt, x.en]).filter(short)])];
    expect(labels.length).toBeGreaterThan(3000);
    const bad = labels.filter((x) => !keep.has(x) && disp31(x) !== x);
    expect(bad).toEqual([]);
    // via t(): toda chave de S volta igual (o t() marca o rótulo)
    withPt(() => { for (const x of Object.values(S)) expect(plain31(shown(t(x)))).toBe(x.pt); });
  });

  it('src/data/uiwords31.ts está em dia com o código (npx tsx scripts/r31/uiwords31.ts)', async () => {
    const p = realPairsOff31();
    expect(render31(uiCollisions31(p.names, p.titles, uiLiterals31(), await entityOk31()))).toBe(fs.readFileSync('src/data/uiwords31.ts', 'utf8'));
  });

  it('mundo com nomes reais e exibição desligada: rótulos intactos, atos e discos reais trocados', () => {
    const s = createGame(defaultConfig('x31-nomes', { startYear: 1985, realNames: true }));
    setRealShown31(s, false);
    for (const x of ['Nome', 'Telefone', 'Z', '5', '1984', 'Status']) expect(disp31(x), x).toBe(x);
    const a = Object.values(s.acts).find((x) => x.name === 'The Beatles' || x.name === 'Queen' || x.name === 'Michael Jackson');
    expect(a).toBeTruthy();
    expect(disp31(a!.name)).not.toBe(a!.name);
  });
});
