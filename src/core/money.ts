// Moeda em centavos e índice de preços por década (GDD §18).
// Valores "reais" estão em dólares fictícios de 2020; o jogo mostra o nominal.

const PRICE_INDEX: [number, number][] = [
  [1920, 0.065], [1930, 0.06], [1940, 0.07], [1950, 0.1], [1960, 0.12],
  [1970, 0.16], [1980, 0.33], [1990, 0.52], [2000, 0.69], [2010, 0.87],
  [2020, 1.0], [2030, 1.25], [2040, 1.5],
];

export function priceIndex(year: number): number {
  if (year <= PRICE_INDEX[0][0]) return PRICE_INDEX[0][1];
  for (let i = 1; i < PRICE_INDEX.length; i++) {
    const [y1, v1] = PRICE_INDEX[i];
    const [y0, v0] = PRICE_INDEX[i - 1];
    if (year <= y1) return v0 + ((v1 - v0) * (year - y0)) / (y1 - y0);
  }
  return PRICE_INDEX[PRICE_INDEX.length - 1][1];
}

/** Converte dólares reais (2020) em centavos nominais do ano. */
export function nominal(realDollars: number, year: number): number {
  return Math.round(realDollars * priceIndex(year) * 100);
}

/** Converte centavos nominais em dólares reais (2020). */
export function toReal(cents: number, year: number): number {
  return cents / 100 / priceIndex(year);
}

export function formatMoney(cents: number, locale = 'pt-BR'): string {
  const v = cents / 100;
  const abs = Math.abs(v);
  const en = locale.startsWith('en');
  let s: string;
  if (abs >= 1_000_000_000) s = (abs / 1_000_000_000).toLocaleString(locale, { maximumFractionDigits: 2 }) + (en ? 'B' : ' bi');
  else if (abs >= 1_000_000) s = (abs / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 2 }) + (en ? 'M' : ' mi');
  else if (abs >= 10_000) s = (abs / 1000).toLocaleString(locale, { maximumFractionDigits: 1 }) + (en ? 'k' : ' mil');
  else s = abs.toLocaleString(locale, { maximumFractionDigits: 0 });
  return (v <= -0.5 ? '−$' : '$') + s;
}

export function formatNumber(n: number, locale = 'pt-BR'): string {
  const abs = Math.abs(n);
  const en = locale.startsWith('en');
  if (abs >= 1_000_000) return (n / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 }) + (en ? 'M' : ' mi');
  if (abs >= 10_000) return (n / 1000).toLocaleString(locale, { maximumFractionDigits: 1 }) + (en ? 'k' : ' mil');
  return Math.round(n).toLocaleString(locale);
}
