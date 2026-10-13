// Folha de contato da rodada 28 (arte): relíquias, capas, emblemas do submundo, logos e extras.
// Dev: `npx vite tools/artsheet28` e abra ?part=relics | covers | emblems | logos | extras. As PNG de docs/shots28art saem daqui.
import { RELIC_ARTS28, relicPx28 } from '../../src/ui/pixel/relic28';
import { upscale } from '../../src/ui/pixel/px';
import type { Px } from '../../src/ui/pixel/px';

const root = document.getElementById('root')!;
const part = new URLSearchParams(location.search).get('part') ?? 'relics';
const title = (t: string) => { const e = document.createElement('h1'); e.textContent = t; root.append(e); };
const sec = (t: string) => { const e = document.createElement('h2'); e.textContent = t; root.append(e); const r = document.createElement('div'); r.className = 'row'; root.append(r); return r; };
const cv = (p: Px, sc: number) => upscale(p.canvas(), p.w * sc, p.h * sc);
const cell = (el: HTMLElement, label: string, cls = '') => { const d = document.createElement('div'); d.className = 'cell ' + cls; const s = document.createElement('span'); s.textContent = label; d.append(el, s); return d; };

if (part === 'emblems') {
  title('Emblemas do submundo — organizações reais e fictícias do jogo + golpes (32×32, ×3)');
  const { ORGS17 } = await import('../../src/data/orgs17');
  const { ORGS19 } = await import('../../src/data/media19b');
  const { countryOfCity } = await import('../../src/data/geo');
  const { emblemPx28, EMBLEM_KINDS28 } = await import('../../src/ui/pixel/emblem28');
  const r = sec('Organizações do jogo (ORGS17 + ORGS19)');
  for (const o of [...ORGS17, ...ORGS19]) r.append(cell(cv(emblemPx28({ id: o.id, kind: o.kind, a3: countryOfCity(o.city || 'rio') ?? undefined, rackets: o.rackets, name: o.name.pt }), 3), o.name.pt, 'w2'));
  for (const k of EMBLEM_KINDS28) {
    const rr = sec(`tipo ${k} — sementes e regiões`);
    ['ITA', 'USA', 'JPN', 'BRA', 'MEX', 'HKG', 'RUS', 'GBR', '', 'JAM'].forEach((a3, i) => rr.append(cell(cv(emblemPx28({ id: `x${i}${k}`, kind: k, a3: a3 || undefined, rackets: i % 2 ? ['payola', 'bootleg'] : ['violence'], name: `Clan Nero ${i}` }), 2), a3 || '—')));
  }
}

if (part === 'covers') {
  title('Capas — 27 composições novas (40×40, ×2) + desgaste + capas finais por gênero/época');
  const { COVER_LAYOUTS28, coverLayoutPx28, wear28 } = await import('../../src/ui/pixel/cover28');
  const { coverPx } = await import('../../src/ui/art');
  const G = ['bebop', 'country', 'samba', 'reggae', 'afrobeat', 'enka', 'classical', 'heavy_metal', 'hiphop', 'disco', 'techno', 'synthpop', 'punk', 'indie', 'prog', 'pop'];
  const acts = ['Miles Group', 'Os Mutantes', 'Nova Onda', 'Rita Lee', 'Daft Duo', 'The Kinks', 'Elis', 'Iron Crow'];
  const r1 = sec('Composições (semente fixa, gênero/ano típicos)');
  COVER_LAYOUTS28.forEach((lay, i) => r1.append(cell(cv(coverLayoutPx28(lay, 500 + i * 7, ['Kind of Blue Moon', 'Live at the Roxy', 'Tropical'][i % 3], acts[i % acts.length], G[i % G.length], 1960 + (i * 3) % 70, 0.7), 2), lay, 'w2')));
  const r2 = sec('Desgaste: aro do vinil (15 e 30 anos de estante) e adesivo');
  for (let i = 0; i < 8; i++) { const p = coverLayoutPx28(COVER_LAYOUTS28[i * 3 % 27], 900 + i, 'Old Record', acts[i], G[i], 1958 + i * 4); wear28(p, 77 + i, i < 4 ? 15 : 30, 1958 + i * 4); r2.append(cell(cv(p, 2), `+${i < 4 ? 15 : 30} anos`, 'w2')); }
  for (const y of [1952, 1968, 1977, 1986, 1995, 2006, 2020, 2034]) {
    const r = sec(`Capas finais (coverPx) em ${y}`);
    G.slice(0, 12).forEach((g, i) => r.append(cell(cv(coverPx(3000 + i * 41 + y, ['Album', 'Night Songs', 'Live Forever', 'Sol'][i % 4], acts[i % acts.length], g, y, i % 4 === 0 ? 0.3 : 0.7), 2), g, 'w2')));
  }
}

if (part === 'logos') {
  title('Logos de banda — 18 estilos por gênero/época (32×32, ×2) + letreiros (64×16, ×2)');
  const { LOGO_STYLES28, logoStylePx28, wordmarkPx28 } = await import('../../src/ui/pixel/logo28');
  const { logoPx } = await import('../../src/ui/art');
  const ini = ['IC', 'SP', 'DQ', 'OA', 'RN', 'MX', 'LV', 'TB'];
  for (const st of LOGO_STYLES28) { const r = sec(st); for (let i = 0; i < 8; i++) r.append(cell(cv(logoStylePx28(st, 40 + i * 13, ini[i], 'rock', 1985), 2), ini[i])); }
  const names: [string, string, number][] = [['Iron Crow', 'heavy_metal', 1982], ['Sex Pistons', 'punk', 1977], ['Glitter Queen', 'disco', 1977], ['Blur Oasis', 'britpop', 1994], ['MC Ruas', 'hiphop', 1991], ['Neon Arcade', 'synthpop', 1984], ['the paper kites', 'indie', 2008], ['Dolly Ranch', 'country', 1975], ['Miles Group', 'bebop', 1956], ['Lion Dub', 'reggae', 1977], ['Daft Duo', 'house', 1996], ['Soul Train', 'soul', 1968], ['Os Mutantes', 'tropicalia', 1968], ['Kyoto Sakura', 'jpop', 1999], ['Fela Band', 'afrobeat', 1972]];
  const rw = sec('Letreiros (wordmark) por gênero');
  for (const [n, g, y] of names) rw.append(cell(cv(wordmarkPx28(h28s(n), n, g, y), 2), `${g}`, 'w3'));
  const rf = sec('Logos finais (logoPx) dos mesmos atos — ~45% seguem o logo original');
  for (const [n, g, y] of names) for (let k = 0; k < 2; k++) rf.append(cell(cv(logoPx(h28s(n) + k * 17, n, g, y), 2), `${g}`));
}

if (part === 'extras') {
  title('Extras — marcas de gravadora, cartazes e bottons de festival, mastros de revista, troféus e ingressos');
  const { LABEL_MARKS28, labelMarkPx28, festivalPosterPx28, festivalPinPx28, mastheadPx28, MAST_KINDS28 } = await import('../../src/ui/pixel/extras28');
  const { FESTIVALS } = await import('../../src/data/catalog');
  const labels = ['Odeon', 'Philips', 'Elenco', 'Som Livre', 'Trama', 'Deck', 'Biscoito Fino', 'Rocinante'];
  for (const mk of LABEL_MARKS28) { const r = sec(`gravadora: ${mk}`); labels.forEach((n, i) => r.append(cell(cv(labelMarkPx28(`l${i}${mk}`, n, 1930 + i * 12, mk), 2), `${n}`))); }
  const rf = sec('Cartazes de festival (32×44, ×2) — épocas');
  FESTIVALS.slice(0, 14).forEach((f, i) => rf.append(cell(cv(festivalPosterPx28(f.name, [1958, 1969, 1975, 1988, 1997, 2012, 2025][i % 7], 0, ['Headliner Band']), 2), `${f.name}`, 'w2')));
  const rp = sec('Bottons de festival (16×16, ×3)');
  FESTIVALS.slice(0, 20).forEach((f) => rp.append(cell(cv(festivalPinPx28(f.name, f.start), 3), f.name.slice(0, 10))));
  const outs = ['Rock Chronicle', 'Weekly Needle', 'Sigilo Total', 'Palco & Partitura', 'Groove Bulletin', 'Zine do Porao', 'Pitchfork Feed', 'Radio Onda'];
  for (const k of MAST_KINDS28) { const r = sec(`mastro: ${k}`); outs.slice(0, 5).forEach((n) => r.append(cell(cv(mastheadPx28(n, k), 2), n, 'w3'))); }
  const { relicPx28 } = await import('../../src/ui/pixel/relic28');
  const rt = sec('Troféus de premiação e ingressos (reuso de relic28)');
  ['Golden Gramophone', 'MTV Moonman astronaut', 'Critics cup', 'Live Act', 'BRIT statuette'].forEach((n, i) => rt.append(cell(cv(relicPx28('trophy', `aw${i}`, 1990, n), 3), n.split(' ')[0], 'w2')));
  [1950, 1972, 1990, 2015].forEach((y, i) => rt.append(cell(cv(relicPx28('ticket', `tk${i}`, y), 3), String(y), 'w2')));
}

function h28s(s: string): number { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 100000; }

if (part === 'relics') {
  title('Relíquias — 48 tipos × épocas (24×24, ×2)');
  const years = [1940, 1958, 1972, 1988, 2012, 2035];
  for (const a of RELIC_ARTS28) {
    const r = sec(a);
    years.forEach((y, i) => r.append(cell(cv(relicPx28(a, `s${i}`, y), 2), String(y))));
    for (let k = 0; k < 4; k++) r.append(cell(cv(relicPx28(a, `v${k}`, 1975), 2), `seed ${k}`));
  }
}
