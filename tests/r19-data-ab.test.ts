// Rodada 19 (Frente 10) — pacotes WP-A (artistas 1920–49) e WP-B (Caribe + África): contagens, coerência e presença no jogo.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { REAL_ALL, REAL_BASE } from '../src/sim/sys/realworld';
import { countryInfoByA3 } from '../src/data/countries';
import { cityById, genreById } from '../src/data/world';
import { PACKS19, norm19 } from '../src/data/more19';

const A = PACKS19.find((p) => p.id === 'wp_a')!.artists!;
const B = PACKS19.find((p) => p.id === 'wp_b')!.artists!;
const inGame = (n: string) => REAL_ALL.findIndex((x) => norm19(x.n) === norm19(n));
const KILLERS = ['Vybz Kartel', 'Don Drummond', 'Spade Cooley', 'Saad Lamjarred', 'Rolf Harris'];

describe('r19 WP-A / WP-B: dados de artistas', () => {
  it('tamanho dos pacotes', () => {
    expect(A.length).toBeGreaterThanOrEqual(80);
    expect(B.filter((a) => ['JAM', 'TTO', 'HTI', 'DOM', 'PRI', 'CUB', 'BHS'].includes(a.cn) || ['kassav', 'fugees', 'aventura', 'romeosantos', 'princeroyce', 'marcanthony', 'williecolon', 'steelpulse', 'aswad'].includes(norm19(a.n).replace(/[^a-z]/g, ''))).length).toBeGreaterThanOrEqual(40);
    expect(B.length).toBeGreaterThanOrEqual(120);
  });

  it('ids, datas e fichas de país coerentes; era certa; sem duplicata entre pacotes; sem criminosos reais', () => {
    const seen = new Set<string>();
    for (const a of [...A, ...B]) {
      expect(genreById[a.g], `${a.n}: gênero ${a.g}`).toBeTruthy();
      expect(cityById[a.c], `${a.n}: cidade ${a.c}`).toBeTruthy();
      expect(countryInfoByA3[a.cn], `${a.n}: país ${a.cn}`).toBeTruthy();
      expect(!a.b || a.b < a.d, `${a.n}: nasc`).toBe(true);
      expect(!a.x || a.x >= a.d - 1, `${a.n}: morte`).toBe(true);
      expect(seen.has(norm19(a.n)), `duplicado ${a.n}`).toBe(false);
      seen.add(norm19(a.n));
      expect(KILLERS.map(norm19)).not.toContain(norm19(a.n));
    }
    for (const a of A) expect(a.d >= 1913 && a.d <= 1955, `${a.n} fora de 1913–55 (mento: Lord Flea/Count Lasher) (${a.d})`).toBe(true);
    // não repete a era 1889 (1889–1919) nem o catálogo base: todo nome do pacote aparece uma única vez em REAL_ALL
    for (const a of [...A, ...B]) expect(REAL_ALL.filter((x) => norm19(x.n) === norm19(a.n)).length, a.n).toBe(1);
    expect(A.length).toBeGreaterThanOrEqual(80);
  });

  it('entradas aparecem no jogo no ano certo (nomes reais): 1935 (WP-A) e 1980 (WP-B)', () => {
    const g35 = createGame(defaultConfig('r19ab', { startYear: 1935, realNames: true, dbSize: 'huge', mode: 'historic' })); // r27: idem (sem sorte do modo livre)
    const names35 = new Set(Object.values(g35.acts).map((x) => x.name));
    for (const n of ['Mamie Smith', 'King Oliver', 'Art Tatum']) expect(names35.has(n), n).toBe(true);
    // r21: modo histórico — o modo livre pula 8% dos reais por sorteio, e o teste é sobre a data de entrada, não sobre sorte
    const g80 = createGame(defaultConfig('r19ab', { startYear: 1980, realNames: true, dbSize: 'huge', mode: 'historic' }));
    const names80 = new Set(Object.values(g80.acts).map((x) => x.name));
    for (const n of ['The Skatalites', 'Burning Spear', 'Prince Buster', 'Manu Dibango', 'Nass El Ghiwane']) expect(names80.has(n), n).toBe(true);
    for (const n of ['Chronixx', 'Koffee', 'Uncle Waffles', 'Black Sherif']) expect(names80.has(n), `${n} é do futuro`).toBe(false);
    const idx = inGame('Burning Spear');
    expect(idx).toBeGreaterThanOrEqual(0);
    const act = Object.values(g80.acts).find((x) => x.name === 'Burning Spear');
    expect(act?.catalogNo).toBe(REAL_BASE + idx);
  });
});
