// Cenas históricas com arco (início, auge, fim), "assinar a cena" chegando cedo, visual da cena
// (para os avatares), reações culturais contra gêneros saturados e o sistema de trainees coreano.

import { clamp, type Rng } from '../../../core/rng';
import { cityById, genreById, l, type L } from '../../../data/world';
import { registerMod } from '../../ext4';
import type { Act, GameState } from '../../types';
import { fmtL, money, notify, post, remember, rngOf } from '../../util';
import { spawnProceduralAct } from '../../worldgen';
import { liveMine, mineAct, mineRel, rep } from './common';
import { w4, type SceneLook } from './state';

export interface HistScene {
  id: string;
  name: L;
  city: string;
  genres: string[];
  from: number;
  peak: number;
  to: number;
  realRef: string;
  arc: [L, L, L]; // início, auge, fim
  look: SceneLook;
}

const look = (pt: string, en: string, outfit: string, hair: string, accessory: string, palette: string[]): SceneLook => ({ label: l(pt, en), outfit, hair, accessory, palette });

export const HIST_SCENES: HistScene[] = [
  { id: 'harlem', name: l('Harlem e o jazz', 'Harlem jazz'), city: 'new_york', genres: ['hot_jazz', 'stride', 'big_band', 'vocal_jazz', 'nola_jazz'], from: 1920, peak: 1928, to: 1940, realRef: 'Renascença do Harlem, Cotton Club, Savoy',
    arc: [l('Pianistas de stride disputam rent parties nos apartamentos do Harlem.', 'Stride pianists battle at Harlem rent parties.'), l('Clubes lotados e orquestras no rádio: o Harlem dita o ritmo do país.', 'Packed clubs and orchestras on the radio: Harlem sets the nation\'s rhythm.'), l('A Depressão fecha os clubes e o swing vira negócio do centro da cidade.', 'The Depression shuts the clubs and swing becomes a downtown business.')],
    look: look('Smokings, chapéus fedora e vestidos de franja', 'Tuxedos, fedoras and fringe dresses', 'tuxedo', 'slick', 'fedora', ['#1b1b2f', '#c9a227', '#f2e6c9']) },
  { id: 'memphis', name: l('Memphis e o rockabilly', 'Memphis rockabilly'), city: 'memphis', genres: ['rockabilly', 'rnr', 'rnb'], from: 1953, peak: 1956, to: 1960, realRef: 'Sun Records',
    arc: [l('Um pequeno estúdio grava caminhoneiros que misturam country e blues.', 'A small studio records truck drivers mixing country and blues.'), l('O rockabilly explode nas rádios e nas TVs: quadris balançando ao vivo.', 'Rockabilly explodes on radio and TV: swinging hips on live TV.'), l('Serviço militar, escândalos e acidentes encerram a primeira geração.', 'Military service, scandals and crashes end the first generation.')],
    look: look('Topetes, jaquetas de couro e camisas de boliche', 'Pompadours, leather jackets and bowling shirts', 'leather_jacket', 'pompadour', 'rolled_sleeves', ['#111111', '#d62828', '#f1faee']) },
  { id: 'detroit_soul', name: l('Detroit e a soul em linha de montagem', 'Detroit assembly-line soul'), city: 'detroit', genres: ['soul', 'girl_group', 'funk'], from: 1959, peak: 1965, to: 1972, realRef: 'Motown (Hitsville U.S.A.)',
    arc: [l('Um ex-operário da fábrica de carros abre um selo numa casa com placa de "Hitsville".', 'A former auto worker opens a label in a house with a "Hitsville" sign.'), l('Controle de qualidade semanal, escola de etiqueta e um hit atrás do outro.', 'Weekly quality control, etiquette school and hit after hit.'), l('O selo se muda para Los Angeles e a cidade perde seu som.', 'The label moves to Los Angeles and the city loses its sound.')],
    look: look('Ternos combinando, luvas e vestidos de lantejoula', 'Matching suits, gloves and sequined gowns', 'matching_suit', 'beehive', 'gloves', ['#2b2d42', '#ef233c', '#edf2f4']) },
  { id: 'kingston', name: l('Kingston e os sound systems', 'Kingston sound systems'), city: 'kingston', genres: ['ska', 'reggae', 'dub', 'mento', 'dancehall'], from: 1956, peak: 1975, to: 1985, realRef: 'Sound systems de Kingston, Studio One, Black Ark',
    arc: [l('Caminhões com caixas de som gigantes disputam o público nos quintais.', 'Trucks with giant speakers compete for crowds in the yards.'), l('Reggae e dub ganham o mundo; o estúdio vira instrumento.', 'Reggae and dub conquer the world; the studio becomes an instrument.'), l('A violência política e a morte de um ídolo mudam a cena para o dancehall digital.', 'Political violence and an idol\'s death shift the scene to digital dancehall.')],
    look: look('Dreadlocks, boinas tricolores e camisas abertas', 'Dreadlocks, tricolor tams and open shirts', 'open_shirt', 'dreadlocks', 'tam', ['#007a33', '#ffcd00', '#d21034']) },
  { id: 'bronx', name: l('Bronx e as festas de quarteirão', 'Bronx block parties'), city: 'new_york', genres: ['hiphop', 'boom_bap', 'funk'], from: 1973, peak: 1979, to: 1986, realRef: 'Kool Herc, 1520 Sedgwick Ave.',
    arc: [l('Um DJ usa dois toca-discos para esticar o break; jovens dançam no chão do parque.', 'A DJ uses two turntables to stretch the break; kids dance on the park floor.'), l('MCs, grafite e b-boys: o primeiro rap chega ao disco e às paradas.', 'MCs, graffiti and b-boys: the first rap hits wax and the charts.'), l('O rap sai do quarteirão e vira indústria nacional.', 'Rap leaves the block and becomes a national industry.')],
    look: look('Agasalhos, tênis sem cadarço e correntes de ouro', 'Tracksuits, laceless sneakers and gold chains', 'tracksuit', 'flat_top', 'gold_chain', ['#ff006e', '#3a86ff', '#ffbe0b']) },
  { id: 'ny_punk', name: l('Nova York punk', 'New York punk'), city: 'new_york', genres: ['punk', 'new_wave', 'post_punk'], from: 1974, peak: 1977, to: 1980, realRef: 'CBGB',
    arc: [l('Num bar do Bowery, bandas tocam músicas de dois minutos para vinte pessoas.', 'At a Bowery bar, bands play two-minute songs for twenty people.'), l('Jaquetas rasgadas e fanzines: o punk atravessa o Atlântico.', 'Torn jackets and fanzines: punk crosses the Atlantic.'), l('A cena se divide entre new wave comercial e hardcore.', 'The scene splits into commercial new wave and hardcore.')],
    look: look('Jaquetas rasgadas, alfinetes e calças justas', 'Ripped jackets, safety pins and skinny jeans', 'ripped_jacket', 'spiky', 'safety_pins', ['#000000', '#e5e5e5', '#ff0054']) },
  { id: 'manchester', name: l('Manchester', 'Manchester'), city: 'manchester', genres: ['post_punk', 'acid_house', 'indie', 'new_wave'], from: 1976, peak: 1989, to: 1992, realRef: 'Factory Records, The Haçienda',
    arc: [l('Depois de um show punk lendário, metade da plateia monta bandas.', 'After a legendary punk gig, half the crowd forms bands.'), l('Acid house e guitarras no mesmo clube: o "Madchester".', 'Acid house and guitars in the same club: "Madchester".'), l('Dívidas e violência fecham o clube; o selo quebra.', 'Debt and violence close the club; the label goes bust.')],
    look: look('Calças largas, chapéus de pescador e smileys', 'Baggy jeans, bucket hats and smileys', 'baggy', 'bowl_cut', 'bucket_hat', ['#ffd60a', '#003566', '#ffffff']) },
  { id: 'seattle', name: l('Seattle', 'Seattle'), city: 'seattle', genres: ['grunge', 'alt_rock'], from: 1986, peak: 1991, to: 1996, realRef: 'Sub Pop',
    arc: [l('Um selo pequeno grava bandas barulhentas e chuvosas.', 'A small label records loud, rainy bands.'), l('Um clipe em ginásio derruba o rock de arena do topo.', 'A gym-set music video knocks arena rock off the top.'), l('Tragédias e a indústria encerram a cena.', 'Tragedy and the industry end the scene.')],
    look: look('Flanela, jeans rasgado e coturnos', 'Flannel, ripped jeans and combat boots', 'flannel', 'long_messy', 'boots', ['#6b4226', '#2f3e46', '#cad2c5']) },
  { id: 'detroit_techno', name: l('Detroit techno', 'Detroit techno'), city: 'detroit', genres: ['techno', 'house'], from: 1985, peak: 1989, to: 1995, realRef: 'Belleville Three, Underground Resistance',
    arc: [l('Três amigos de colégio programam baterias eletrônicas sonhando com o futuro.', 'Three school friends program drum machines dreaming of the future.'), l('Os discos cruzam o oceano e lotam galpões em Berlim e Londres.', 'The records cross the ocean and fill warehouses in Berlin and London.'), l('A cena vive mais na Europa que em casa.', 'The scene lives more in Europe than at home.')],
    look: look('Preto total, óculos escuros e moletons', 'All black, sunglasses and hoodies', 'black_hoodie', 'shaved', 'shades', ['#0b0c10', '#66fcf1', '#c5c6c7']) },
  { id: 'rio_bossa', name: l('Rio e a bossa nova', 'Rio bossa nova'), city: 'rio', genres: ['bossa', 'samba_cancao', 'samba'], from: 1957, peak: 1962, to: 1966, realRef: 'Apartamentos de Copacabana, Elenco',
    arc: [l('Jovens de Copacabana cantam baixinho sobre um violão de batida nova.', 'Copacabana kids sing softly over a guitar with a new beat.'), l('Um concerto em Nova York leva a bossa para o mundo.', 'A New York concert takes bossa to the world.'), l('O golpe e a canção de protesto deixam a bossa para trás.', 'The coup and the protest song leave bossa behind.')],
    look: look('Camisas de linho, mocassins e vestidos tubinho', 'Linen shirts, loafers and shift dresses', 'linen_shirt', 'side_part', 'loafers', ['#0077b6', '#f1faee', '#ffd166']) },
  { id: 'tropicalia', name: l('Bahia e a Tropicália', 'Bahia Tropicália'), city: 'salvador', genres: ['tropicalia', 'mpb'], from: 1967, peak: 1968, to: 1969, realRef: 'Tropicália ou Panis et Circencis',
    arc: [l('Baianos misturam guitarra elétrica, berimbau e poesia concreta nos festivais.', 'Bahians mix electric guitar, berimbau and concrete poetry at the festivals.'), l('O disco-manifesto e as vaias: a Tropicália está em toda parte.', 'The manifesto album and the boos: Tropicália is everywhere.'), l('O AI-5 prende e exila os líderes; a cena acaba em meses.', 'The AI-5 decree jails and exiles the leaders; the scene ends within months.')],
    look: look('Roupas de plástico, colares e estampas tropicais', 'Plastic clothes, beads and tropical prints', 'tropical_print', 'afro_curls', 'beads', ['#2a9d8f', '#e9c46a', '#e76f51']) },
  { id: 'citypop', name: l('Tóquio e o city pop', 'Tokyo city pop'), city: 'tokyo', genres: ['city_pop', 'jpop', 'kayokyoku'], from: 1976, peak: 1983, to: 1990, realRef: 'City pop',
    arc: [l('Músicos de estúdio japoneses estudam o soft rock da Califórnia.', 'Japanese session players study California soft rock.'), l('Walkmans, carros novos e piscinas: o som da bolha.', 'Walkmans, new cars and pools: the sound of the bubble.'), l('A bolha estoura e o city pop é esquecido — por enquanto.', 'The bubble bursts and city pop is forgotten — for now.')],
    look: look('Ombreiras pastel, óculos aviador e cores de pôr do sol', 'Pastel shoulder pads, aviators and sunset colors', 'pastel_blazer', 'feathered', 'aviators', ['#ff9f1c', '#ffbf69', '#cbf3f0']) },
  { id: 'lagos', name: l('Lagos e o afrobeat', 'Lagos afrobeat'), city: 'lagos', genres: ['afrobeat', 'highlife', 'juju'], from: 1969, peak: 1976, to: 1985, realRef: 'Afrika Shrine',
    arc: [l('Uma banda volta dos EUA com funk na bagagem e política na cabeça.', 'A band returns from the US with funk in the luggage and politics in mind.'), l('O clube vira templo; os discos desafiam os militares.', 'The club becomes a temple; the records defy the generals.'), l('Batidas policiais e prisões encerram a era de ouro.', 'Police raids and arrests end the golden era.')],
    look: look('Conjuntos estampados, pinturas no rosto e saxofones', 'Patterned suits, face paint and saxophones', 'print_suit', 'afro', 'face_paint', ['#ffb703', '#fb8500', '#023047']) },
  { id: 'seoul', name: l('Seul e o k-pop', 'Seoul K-pop'), city: 'seoul', genres: ['kpop', 'k_synth', 'k_indie'], from: 1992, peak: 2012, to: 2040, realRef: 'Seo Taiji, SM/YG/JYP/HYBE',
    arc: [l('Um trio mistura rap e dança na TV e as agências descobrem a fórmula.', 'A trio mixes rap and dance on TV and agencies discover the formula.'), l('Coreografias perfeitas e fandoms globais: Seul exporta ídolos.', 'Perfect choreography and global fandoms: Seoul exports idols.'), l('Fábricas de ídolos enfrentam críticas e o modelo se espalha pela Ásia.', 'Idol factories face criticism and the model spreads across Asia.')],
    look: look('Cabelos coloridos, conjuntos de grife e brincos', 'Colored hair, designer sets and earrings', 'designer_set', 'pastel_hair', 'earrings', ['#ff70a6', '#70d6ff', '#ffd670']) },
];

export const histSceneById: Record<string, HistScene> = Object.fromEntries(HIST_SCENES.map((x) => [x.id, x]));

export type SceneStage = 'future' | 'rise' | 'peak' | 'decline' | 'over';

export function sceneStage(s: GameState, sc: HistScene): SceneStage {
  if (s.year < sc.from) return 'future';
  if (s.year < sc.peak) return 'rise';
  if (s.year <= sc.peak + 2 && s.year <= sc.to) return 'peak';
  if (s.year <= sc.to) return 'decline';
  return 'over';
}

export const STAGE_NAME: Record<SceneStage, L> = {
  future: l('ainda não começou', 'not yet started'), rise: l('nascendo', 'rising'), peak: l('no auge', 'at its peak'), decline: l('em declínio', 'declining'), over: l('encerrada', 'over'),
};

/** Ato pertence à cena (cidade e gênero, ou movimento que nasceu de um dos gêneros). */
export function actInScene(s: GameState, act: Act, sc: HistScene): boolean {
  if (act.city !== sc.city) return false;
  if (sc.genres.includes(act.genre)) return true;
  const mv = act.movementId ? s.movements.find((m) => m.id === act.movementId) : undefined;
  return !!mv && sc.genres.includes(mv.parent);
}

export function signCost(s: GameState, sc: HistScene): number {
  return money(s, sceneStage(s, sc) === 'rise' ? 2500 : 9000);
}

export function signScene(s: GameState, sceneId: string): L | null {
  const sc = histSceneById[sceneId];
  const w = w4(s);
  if (!sc) return l('Cena desconhecida.', 'Unknown scene.');
  const st = sceneStage(s, sc);
  if (st !== 'rise' && st !== 'peak') return l('Só dá para assinar uma cena viva (nascendo ou no auge).', 'You can only sign a living scene (rising or at its peak).');
  if (w.scenes[sceneId]?.signed) return l('Você já assinou essa cena.', 'You already signed this scene.');
  const cost = signCost(s, sc);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `w4scene:${sceneId}`, -cost, 'w4_scenes', `Apoio à cena ${sceneId}`);
  (w.scenes[sceneId] ??= {}).signed = st === 'rise' ? -s.year : s.year; // negativo = chegou cedo
  rep(s, 'artistic', st === 'rise' ? 4 : 2);
  // um talento local aparece para o selo que bancou a cena
  const genre = sc.genres.find((g) => genreById[g] && genreById[g].born <= s.year);
  if (genre && cityById[sc.city]) {
    const r = rngOf(s);
    const a = spawnProceduralAct(s, r, { city: sc.city, genre });
    a.momentum = clamp(a.momentum + 20, 0, 100);
    remember(s, 'scene_sign', fmtL(l('O selo banca a cena {n}; {a} desponta por lá.', 'The label backs the {n} scene; {a} emerges there.'), { n: sc.name, a: a.name }), { important: true });
  }
  return null;
}

export function sceneBonus(s: GameState, sceneId: string): number {
  const sig = w4(s).scenes[sceneId]?.signed;
  if (!sig) return 1;
  return sig < 0 ? 1.2 : 1.1;
}

registerMod('appeal', 'w4scene', (s, value, ctx) => {
  const act = ctx.act;
  if (!act || !ctx.release || !mineRel(s, ctx.release)) return null;
  let k = 1;
  for (const sc of HIST_SCENES) {
    if (sceneStage(s, sc) === 'over' || sceneStage(s, sc) === 'future') continue;
    if (actInScene(s, act, sc)) k = Math.max(k, sceneBonus(s, sc.id));
  }
  return k > 1 ? { value: value * k, label: l('Cena que o selo assinou', 'Scene the label signed') } : null;
});

function scenesMonth(s: GameState): void {
  const w = w4(s);
  for (const sc of HIST_SCENES) {
    const st = sceneStage(s, sc);
    const rec = (w.scenes[sc.id] ??= {});
    if (st === 'future') continue;
    if (st === 'over') {
      if (rec.announced !== undefined && rec.announced !== 3 && s.year === sc.to + 1) {
        rec.announced = 3;
        remember(s, 'hist_scene', fmtL(l('Fim de uma era: {n}. {t}', 'End of an era: {n}. {t}'), { n: sc.name, t: sc.arc[2] }), { important: true });
      }
      delete w.looks[sc.id];
      if (!rec.signed && rec.announced === undefined) delete w.scenes[sc.id];
      continue;
    }
    w.looks[sc.id] = sc.look;
    const boost = st === 'rise' ? 0.25 : st === 'peak' ? 0.5 : 0.1;
    for (const g of sc.genres) if (genreById[g] && genreById[g].born <= s.year) s.scenes[`${sc.city}:${g}`] = (s.scenes[`${sc.city}:${g}`] ?? 0) + boost;
    const phase = st === 'rise' ? 0 : st === 'peak' ? 1 : 2;
    if (rec.announced === undefined || rec.announced < phase) {
      rec.announced = phase;
      const text = fmtL(l('{n}: {t}', '{n}: {t}'), { n: sc.name, t: sc.arc[phase] });
      remember(s, 'hist_scene', text, { important: phase === 0 });
      if (phase < 2) notify(s, fmtL(phase === 0 ? l('Cena nascendo: {n}. Chegue cedo!', 'Scene rising: {n}. Get there early!') : l('Cena no auge: {n}.', 'Scene at its peak: {n}.'), { n: sc.name }), 'event');
    }
  }
}

/** Visual da cena de um ato (para retratos e avatares). */
export function sceneLookFor(s: GameState, act: Act): SceneLook | undefined {
  for (const sc of HIST_SCENES) if (w4(s).looks[sc.id] && actInScene(s, act, sc)) return w4(s).looks[sc.id];
  return undefined;
}

// ======================================================================= reações culturais

export const BACKLASH_NAME: Record<'burning' | 'death' | 'panic', L> = {
  burning: l('Queima de discos', 'Record burning'),
  death: l('"O gênero morreu"', '"The genre is dead"'),
  panic: l('Pânico moral', 'Moral panic'),
};

function backlashMonth(s: GameState): void {
  const w = w4(s);
  w.backlash = w.backlash.filter((b) => s.year <= b.until);
  const top = s.charts.singles.slice(0, 40);
  if (top.length < 20) return;
  const count: Record<string, number> = {};
  for (const e of top) { const g = s.acts[s.releases[e.releaseId]?.actId ?? '']?.genre; if (g) count[g] = (count[g] ?? 0) + 1; }
  for (const g of new Set([...Object.keys(count), ...Object.keys(w.sat)])) {
    const share = (count[g] ?? 0) / top.length;
    if (share > 0.25 && (s.genrePop[g] ?? 0) > 1.05) w.sat[g] = (w.sat[g] ?? 0) + 1;
    else w.sat[g] = Math.max(0, (w.sat[g] ?? 0) - 1);
    if (!w.sat[g]) delete w.sat[g];
    if ((w.sat[g] ?? 0) >= 8 && !w.backlash.some((b) => b.genre === g)) {
      const kind = s.year < 1975 ? 'burning' : s.year < 1986 ? 'death' : 'panic';
      w.backlash.push({ genre: g, from: s.year, until: s.year + 2, kind });
      s.genrePop[g] = clamp((s.genrePop[g] ?? 1) * 0.75, 0.15, 2.2);
      delete w.sat[g];
      const name = genreById[g]?.name ?? l(g);
      const text = kind === 'burning'
        ? fmtL(l('Pastores e políticos organizam fogueiras com discos de {g}.', 'Preachers and politicians organize bonfires of {g} records.'), { g: name })
        : kind === 'death'
          ? fmtL(l('Saturação: jornais e rádios decretam que "{g} morreu".', 'Saturation: papers and radio declare "{g} is dead".'), { g: name })
          : fmtL(l('Pânico moral: {g} é acusado de corromper a juventude.', 'Moral panic: {g} is accused of corrupting the youth.'), { g: name });
      remember(s, 'backlash', text, { important: true });
      notify(s, text, 'event');
      if (kind === 'panic' && liveMine(s).some((a) => a.genre === g)) rep(s, 'institutional', -2);
    }
  }
}

registerMod('appeal', 'w4backlash', (s, value, ctx) => {
  const g = ctx.act?.genre;
  const b = g ? w4(s).backlash.find((x) => x.genre === g && s.year <= x.until) : undefined;
  return b ? { value: value * 0.85, label: BACKLASH_NAME[b.kind] } : null;
});

// ======================================================================= trainees (Coreia)

export const TRAINEE_WEEKS = 104;

export function enrollTrainee(s: GameState, actId: string): L | null {
  const a = s.acts[actId];
  const w = w4(s);
  if (w.ms.trainees === undefined) return l('O sistema de trainees ainda não existe.', 'The trainee system does not exist yet.');
  if (!mineAct(s, a)) return l('Ato não é seu.', 'Not your act.');
  if (w.trainees[actId]) return l('Já passou pelo treinamento.', 'Already went through training.');
  const cost = money(s, 2500);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `w4trainee:${actId}`, -cost, 'w4_markets', `Matrícula de trainees ${a.name}`);
  w.trainees[actId] = { from: s.week, until: s.week + TRAINEE_WEEKS };
  return null;
}

function traineesMonth(s: GameState): void {
  const w = w4(s);
  for (const [id, t] of Object.entries(w.trainees)) {
    const a = s.acts[id];
    if (!a) { delete w.trainees[id]; continue; }
    if (s.week >= t.until) continue;
    if (mineAct(s, a)) post(s, `w4trmonth:${id}`, -money(s, 600), 'w4_markets', `Treinamento de trainees ${a.name}`);
    for (const pid of a.members) {
      const p = s.persons[pid];
      if (!p) continue;
      p.skills.voice = clamp(p.skills.voice + 0.6, 0, 100);
      p.skills.stage = clamp(p.skills.stage + 0.8, 0, 100);
    }
    const key = `w4trdone:${id}`;
    if (s.week + 5 >= t.until && !s.flags[key]) {
      s.flags[key] = 1;
      remember(s, 'trainee', fmtL(l('{a} conclui o treinamento e estreia.', '{a} completes training and debuts.'), { a: a.name }), { actId: id, important: true });
    }
  }
}

registerMod('appeal', 'w4trainee', (s, value, ctx) => {
  const act = ctx.act;
  const t = act ? w4(s).trainees[act.id] : undefined;
  if (!t || !act) return null;
  if (s.week < t.until) return { value: value * 0.8, label: l('Em treinamento', 'In training') };
  const asian = ['kpop', 'jpop', 'k_synth', 'cantopop', 'mandopop', 'anison'].includes(act.genre);
  return { value: value * (asian ? 1.25 : 1.1), label: l('Formado no sistema de trainees', 'Trained idol system') };
});

export function scenesAndMarketsMonth(s: GameState, _r: Rng): void {
  scenesMonth(s);
  backlashMonth(s);
  traineesMonth(s);
}
