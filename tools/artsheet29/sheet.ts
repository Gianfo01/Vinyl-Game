// Folha de contato da rodada 29 (arte): lugares, geografia, insígnias, papéis, objetos, pessoas, capas/logos/cartazes,
// relíquias. Dev: `npx vite tools/artsheet29` e abra ?part=places | geo | badges | paper | things | people | covers |
// logos | relics. As PNG de docs/shots29art saem daqui (scripts/shots29art.mjs).
import { upscale, type Px } from '../../src/ui/pixel/px';

const root = document.getElementById('root')!;
const part = new URLSearchParams(location.search).get('part') ?? 'places';
const title = (t: string) => { const e = document.createElement('h1'); e.textContent = t; root.append(e); };
const sec = (t: string) => { const e = document.createElement('h2'); e.textContent = t; root.append(e); const r = document.createElement('div'); r.className = 'row'; root.append(r); return r; };
const cv = (p: Px, sc: number) => upscale(p.canvas(), p.w * sc, p.h * sc);
const cell = (el: HTMLElement, label: string, cls = '') => { const d = document.createElement('div'); d.className = 'cell ' + cls; const s = document.createElement('span'); s.textContent = label; d.append(el, s); return d; };
const YEARS = [1935, 1958, 1972, 1988, 2012, 2036];
const CITIES = ['new_york', 'london', 'rio', 'tokyo', 'kingston', 'lagos', 'paris', 'mexico_city', 'mumbai', 'berlin', 'sao_paulo', 'nashville'];

if (part === 'places') {
  title('Lugares — fachadas 32×32 (×3) por tipo, época e região + placas de casa de show + ícones de streaming');
  const { PLACES29, placePx29, signPx29, SIGNS29, appIconPx29 } = await import('../../src/ui/pixel/places29');
  for (const k of PLACES29) {
    const r = sec(`${k} — 6 épocas × 2 cidades`);
    YEARS.forEach((y, i) => { for (const c of [CITIES[i % 12], CITIES[(i + 5) % 12]]) r.append(cell(cv(placePx29(k, `${k}${i}${c}`, ['Blue Note', 'The Roxy', 'Odeon Records', 'Rádio Nacional', 'Sun Studio', 'Canal 4'][i], y, c), 3), `${y} ${c.slice(0, 6)}`, 'w2')); });
  }
  const rs = sec('Placas (64×16, ×2): tabuleta → marquise → neon → caixa luminosa → LED');
  for (const s of SIGNS29) for (const n of ['Cavern Club', 'Circo Voador', 'Apollo']) rs.append(cell(cv(signPx29(n, 1970, n, s), 2), s, 'w3'));
  const ra = sec('Streaming (24×24, ×3): ícone de aplicativo pelo nome');
  for (const n of ['Spotify', 'Deezer', 'Tidal', 'Apple Music', 'YouTube Music', 'SoundCloud', 'Napster', 'Pandora', 'Bandcamp', 'Amazon Music', 'NeuroStream', 'Sonora']) ra.append(cell(cv(appIconPx29(n, n === 'Napster' ? 2000 : 2018), 3), n, 'w2'));
}

if (part === 'geo') {
  title('Geografia — bandeiras 24×16, brasões de cidade 24×28, horizontes 48×24');
  const { FLAG_CODES29, flagPx29, cityCrestPx29, skylineThumbPx29 } = await import('../../src/ui/pixel/geo29');
  const { CITIES: CS } = await import('../../src/data/world');
  const rf = sec(`Bandeiras (${FLAG_CODES29.length} desenhadas + flâmula neutra)`);
  for (const a3 of [...FLAG_CODES29, 'XKX', 'ZZZ']) rf.append(cell(cv(flagPx29(a3), 3), a3));
  const rc = sec('Brasões de cidade');
  for (const c of CS.slice(0, 60)) rc.append(cell(cv(cityCrestPx29(c.id), 2), c.id.slice(0, 9)));
  for (const y of [1950, 1985, 2020]) { const rk = sec(`Horizontes em ${y}`); for (const c of CITIES) rk.append(cell(cv(skylineThumbPx29(c, y, y === 1985), 2), c, 'w2')); }
}

if (part === 'badges') {
  title('Insígnias — gêneros, movimentos, facções de fãs, medalhões de premiação, cabeçalhos de parada');
  const b = await import('../../src/ui/pixel/badge29');
  const { GENRES } = await import('../../src/data/world');
  const rg = sec(`Selos de gênero (${GENRES.length})`);
  for (const g of GENRES) rg.append(cell(cv(b.genreBadgePx29(g.id), 2), g.id.slice(0, 10)));
  const rm = sec('Movimentos');
  ['tropicalia', 'punk', 'grunge', 'bossa', 'house', 'britpop', 'afrobeat', 'hiphop'].forEach((g, i) => rm.append(cell(cv(b.movementBadgePx29(`mv${i}`, g, 1960 + i * 6), 2), g)));
  const rfan = sec('Flâmulas de facção de fãs');
  [['purist', 'Puristas'], ['main', 'Fãs de rádio'], ['coll', 'Colecionadores'], ['comm', 'Comunidade'], ['x1', 'Army'], ['x2', 'Dark Ones'], ['x3', 'Flower kids'], ['x4', 'Night owls']].forEach(([id, n], i) => rfan.append(cell(cv(b.fanBannerPx29(id, n, ['The Beatles', 'BTS', 'Black Sabbath', 'Anitta'][i % 4], ['rock', 'kpop', 'heavy_metal', 'funk_carioca'][i % 4]), 3), n)));
  const ra = sec('Medalhões de premiação');
  [['Grammy', 1959], ['Prêmio Sharp', 1988], ['VMA', 1995], ['Latin Grammy', 2005], ['Brit Awards', 1977], ['Mercury Prize', 1992], ['Prêmio da Música', 2034], ['Classic Awards', 1950]].forEach(([n, y]) => ra.append(cell(cv(b.awardSealPx29(String(n), String(n), Number(y)), 2), `${n} ${y}`, 'w2')));
  const rc = sec('Cabeçalhos de parada por época (64×16, ×2)');
  for (const y of [1952, 1962, 1974, 1985, 1995, 2006, 2018, 2033]) rc.append(cell(cv(b.chartHeaderPx29(y < 1990 ? 'TOP 40' : 'HOT 100', y), 2), String(y), 'w3'));
}

if (part === 'paper') {
  title('Papéis e telas — contratos, capas de revista, programas de TV/rádio, processos');
  const pp = await import('../../src/ui/pixel/paper29');
  const rc = sec('Contratos por época (28×36, ×2)');
  for (const k of pp.DOCS29) for (const t of ['CLASSICO', '360']) rc.append(cell(cv(pp.contractPx29(`c${k}${t}`, t, 1975, k), 2), `${k} ${t}`, 'w2'));
  const rm = sec('Capas de revista e fanzine com o artista (32×40, ×2)');
  pp.MAGS29.forEach((k, i) => YEARS.slice(1, 5).forEach((y, j) => rm.append(cell(cv(pp.magCoverPx29(['Rolling Stone', 'Sniffin Glue', 'The Sun', 'Billboard', 'Pitchfork'][i], k, y, { id: `cov${i}${j}` }, j % 2 ? 'EXCLUSIVO' : ''), 2), `${k} ${y}`, 'w2'))));
  const rs = sec('Programas de TV e rádio (48×32, ×2)');
  YEARS.forEach((y, i) => { rs.append(cell(cv(pp.showCardPx29(`tv${i}`, ['Ed Sullivan', 'Top of the Pops', 'Soul Train', 'MTV Unplugged', 'Altas Horas', 'HoloShow'][i], 'tv', y, { id: `host${i}` }), 2), `TV ${y}`, 'w3')); rs.append(cell(cv(pp.showCardPx29(`rd${i}`, ['Hit Parade', 'Peel Session', 'Rádio Fluminense', 'Hot 97', 'BBC 6', 'NeuroFM'][i], 'radio', y), 2), `rádio ${y}`, 'w3')); });
  const rp = sec('Processos');
  for (const k of ['gavel', 'scales', 'courtroom'] as const) for (const y of [1955, 1990, 2035]) rp.append(cell(cv(pp.casePx29(`${k}${y}`, k, y), 3), `${k} ${y}`, 'w2'));
}

if (part === 'things') {
  title('Objetos — equipamentos do estúdio, merchandising com o logo do ato, veículos de turnê');
  const th = await import('../../src/ui/pixel/things29');
  const rg = sec('Equipamentos (24×24, ×3)');
  for (const k of th.GEARS29) rg.append(cell(cv(th.gearPx29(k, k), 3), k));
  const acts: [number, string, string, number][] = [[11, 'Iron Crow', 'heavy_metal', 1984], [52, 'Os Mutantes', 'tropicalia', 1970], [7, 'Daft Duo', 'house', 2012], [93, 'Lion Dub', 'reggae', 1978]];
  for (const [seed, n, g, y] of acts) { const r = sec(`Merch de ${n} (${g}, ${y})`); for (const k of th.MERCH29) r.append(cell(cv(th.merchPx29(k, seed, n, g, y), 3), k)); }
  for (const m of ['van', 'bus', 'fly'] as const) { const r = sec(`Veículo: ${m}`); for (const y of YEARS) r.append(cell(cv(th.vehiclePx29(m, y, `t${y}`), 2), String(y), 'w3')); }
}

if (part === 'people') {
  title('Pessoas — retratos de bastidor (função × época), foto da banda, roupas e corpos novos');
  const pe = await import('../../src/ui/pixel/people29');
  const { portraitPx, randomLook } = await import('../../src/ui/pixel/avatar');
  const { flavor27 } = await import('../../src/ui/pixel/looks27');
  for (const k of pe.STAFF29) { const r = sec(`${k}`); YEARS.forEach((y, i) => r.append(cell(cv(pe.staffPortraitPx29({ id: `${k}${i}` }, k, y), 2), String(y)))); }
  for (const kind of pe.PHOTOS29) { const r = sec(`Foto da banda — ${kind}`); [1, 2, 3, 4, 5].forEach((n) => r.append(cell(cv(pe.bandPhotoPx29(pe.fakeMembers29(`band${n}${kind}`, n), 1975, 40, 30, kind, n), 3), `${n} integr.`, 'w3'))); }
  const ro = sec('Roupas novas 26..33 (retrato) em 3 épocas');
  for (let o = 26; o <= 33; o++) for (const y of [1950, 1985, 2020]) { const a = { ...randomLook(`o${o}`), outfit: o, sx: (o === 26 ? 'm' : 'f') as 'm' | 'f' }; ro.append(cell(cv(portraitPx({ id: `o${o}`, look: a }, y), 2), `${o} ${y}`)); }
  const rb = sec('Corpos 0..4 (retrato)');
  for (let b = 0; b <= 4; b++) rb.append(cell(cv(portraitPx({ id: 'body', look: { ...randomLook('body'), body: b } }, 1990), 3), `body ${b}`, 'w2'));
  const rr = sec('Gerador com o tempero 29 (país/gênero)');
  const ctx: [string, string, number][] = [['KOR', 'kpop', 1995], ['NGA', 'afrobeat', 1975], ['CUB', 'son', 1955], ['USA', 'heavy_metal', 1988], ['BRA', 'samba', 1982], ['USA', 'bebop', 1946]];
  for (const [c, g, y] of ctx) for (let i = 0; i < 6; i++) { const id = `fl${c}${i}`; rr.append(cell(cv(portraitPx({ id, look: flavor27(randomLook(id), id, { year: y, genre: g, country: c, family: undefined }) }, y), 2), `${c} ${y}`)); }
}

if (part === 'covers') {
  title('Capas — 12 composições novas (6 com foto da banda), cartazes de parede e capas finais por gênero/época');
  const { COVER_LAYOUTS29, coverLayoutPx29 } = await import('../../src/ui/pixel/cover29');
  const { coverPx, posterPx } = await import('../../src/ui/art');
  const { POSTERS29, posterPx29 } = await import('../../src/ui/pixel/poster29');
  const { logoColors } = await import('../../src/ui/art');
  const G = ['bebop', 'country', 'samba', 'reggae', 'afrobeat', 'kpop', 'classical', 'heavy_metal', 'hiphop', 'disco', 'techno', 'synthpop', 'punk', 'indie', 'prog', 'pop'];
  for (const lay of COVER_LAYOUTS29) { const r = sec(lay); YEARS.forEach((y, i) => r.append(cell(cv(coverLayoutPx29(lay, 700 + i * 13, ['Night Songs', 'Live Forever', 'Sol', 'Ao Vivo', 'Blue', 'Neon'][i], ['Miles Group', 'Os Mutantes', 'Rita', 'The Kinks', 'Lion Dub', 'Kyoto'][i], G[(i * 3) % 16], y), 2), String(y), 'w2'))); }
  const rp = sec('Cartazes de parede (14×19, ×4)');
  for (const k of POSTERS29) for (const y of [1960, 1990]) rp.append(cell(cv(posterPx29(k, 31, 'IC', y, logoColors(31 + y, 'rock', y)), 4), `${k} ${y}`));
  const rpf = sec('Cartazes finais (posterPx)'); for (let i = 0; i < 16; i++) rpf.append(cell(cv(posterPx(900 + i * 7, 'Iron Crow', G[i], 1960 + i * 4), 4), G[i]));
  for (const y of [1958, 1977, 1994, 2022]) { const r = sec(`Capas finais (coverPx) em ${y}`); G.forEach((g, i) => r.append(cell(cv(coverPx(5000 + i * 97 + y, ['Album', 'Night Songs', 'Live', 'Sol'][i % 4], ['Miles Group', 'Os Mutantes', 'Rita Lee', 'Iron Crow'][i % 4], g, y, 0.7), 2), g, 'w2'))); }
}

if (part === 'logos') {
  title('Logos — 12 estilos novos (32×32, ×2) e logos finais');
  const { LOGO_STYLES29, logoStylePx29 } = await import('../../src/ui/pixel/logo29');
  const { logoPx } = await import('../../src/ui/art');
  const ini = ['IC', 'SP', 'DQ', 'OA', 'RN', 'MX', 'LV', 'TB'];
  for (const st of LOGO_STYLES29) { const r = sec(st); for (let i = 0; i < 8; i++) r.append(cell(cv(logoStylePx29(st, 40 + i * 13, ini[i], ['rock', 'heavy_metal', 'techno', 'country', 'disco', 'punk', 'samba', 'reggae'][i], 1990), 2), ini[i])); }
  const rf = sec('Logos finais (logoPx) — 40 atos');
  for (let i = 0; i < 40; i++) rf.append(cell(cv(logoPx(300 + i * 31, `Act ${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(66 + (i % 20))}`, ['rock', 'heavy_metal', 'techno', 'country', 'disco', 'punk', 'samba', 'reggae', 'bebop', 'kpop'][i % 10], 1960 + (i * 2) % 70), 2), String(i)));
}

if (part === 'relics') {
  title('Relíquias novas — 16 desenhos × 6 épocas (24×24, ×3)');
  const { RELIC_ARTS29, relicPx29 } = await import('../../src/ui/pixel/relic29');
  for (const a of RELIC_ARTS29) { const r = sec(a); YEARS.forEach((y, i) => r.append(cell(cv(relicPx29(a, `${a}${i}`, y, a === 'neonsign' ? 'Open bar' : 'Peça'), 3), String(y)))); }
}
