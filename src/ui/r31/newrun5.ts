// R31 · onda 5 (INI, EXP-9) — NOVA RUN em ficha de inscrição numa prancheta (mocks onda5-mock-novarun-*.png):
// Começo rápido = uma ficha com as 7 escolhas (quem é você, cidade, carreira, ano na régua das eras, tamanho do
// começo, dificuldade, duração), dois interruptores (nomes reais, história real) e COMEÇAR; à direita, no mesmo papel,
// a prévia "Sua história" (a cena do palco redesenhada na hora, o boneco, o resumo e as etiquetas das regras).
// A configuração sai do mesmo caminho da Nova run rápida antiga (newrun5model › quickRun5Config) e a configuração
// completa é a mesma tela de sempre (newgame.ts), vestida de prancheta pelo gancho `ngSkin31` (skin5 abaixo).

import { CITIES, l, type L } from '../../data/world';
import { S, t } from '../../i18n/strings';
import type { Appearance, RunConfig } from '../../sim/types';
import { careerDef, careerDefs } from '../../sim/sys/careers12';
import { YEAR_MAX20, YEAR_MIN20 } from '../../sim/worldpolicy20';
import { sit29ById, sitOfScenario29 } from '../../sim/start29data';
import { clampAge29 } from '../../sim/char29data';
import { playerTraitById } from '../../sim/sys/persona/data';
import { cityName, modal } from '../common';
import { h, select } from '../dom';
import { ic } from '../vis';
import { store } from '../store';
import { avatarSprite, HAIR_COLORS, OUTFIT_COLORS, SKINS } from '../pixel/avatar';
import { appearanceEditor, fitLookToSex, hairAllowed15, outfitAllowed27 } from '../pixel/editor';
import { OUTFIT27 } from '../pixel/looks27';
import { pasteCode20 } from '../newgame17';
import { launchRun27, newGameScreen, randomSeed } from '../newgame';
import { scenarioScreen } from '../sys/live/goals';
import { SEXES29, quickCharBlock29 } from '../ps/char29';
import { charDefaults29, lookFor29, refreshChar29 } from '../ps/char29model';
import { CAREER_SHORT27, careerOpen27, clampYear27, quickDefaults27 } from '../ps/home27model';
import { ERAS5, PRIMARY5, SIZES5, SIZE_NAME5, TRAITS5, durOf5, histOn5, quickRun5Config, realOn5, story5, yearsOfDur5, type Dur5, type QuickRun5 } from './newrun5model';
import { logo5, mountStage5 } from './stage5ui';
import { tut5Enabled } from './tut5entry'; // R31 onda 5 (TUT): chave "Tutorial guiado" (só com exp5.tut)
import './newrun5.css';

/** Chave "Tutorial guiado" do começo rápido (desligada por padrão; não vai para a ficha nem para o código de run). */
const tutQ5: { on: boolean } = { on: false };
/** A última ficha (o botão "Começo rápido" da configuração completa volta para ela). */
let last5: QuickRun5 | null = null;
const top5 = () => { try { window.scrollTo(0, 0); } catch { /* sem janela */ } };
const lang5 = (): 'pt' | 'en' => (store.prefs.lang === 'en' ? 'en' : 'pt');

const HAIRC5: L[] = [l('preto', 'black'), l('castanho escuro', 'dark brown'), l('castanho', 'brown'), l('ruivo', 'red'), l('loiro', 'blond'), l('acobreado', 'copper'), l('grisalho', 'grey'), l('azul', 'blue'), l('platinado', 'platinum'), l('vermelho', 'crimson'), l('rosa', 'pink'), l('verde', 'green'), l('azul-claro', 'light blue')];
const OUTC5: L[] = [l('azul', 'blue'), l('vinho', 'wine'), l('verde', 'green'), l('mostarda', 'mustard'), l('roxo', 'purple'), l('creme', 'cream'), l('escuro', 'dark'), l('laranja', 'orange'), l('dourado', 'gold'), l('rosa', 'pink'), l('cinza', 'grey'), l('marrom', 'brown'), l('celeste', 'sky blue')];
const OUTN5: L[] = [l('casual', 'casual'), l('paletó', 'jacket'), l('vestido / casaco', 'dress / coat'), l('malha', 'knit'), ...OUTFIT27.map((x) => x[0])];
const CAR5: Record<string, L> = { label: l('Gravadora', 'Record label'), musician: l('Artista / banda', 'Artist / band'), manager: l('Empresário', 'Manager'), studio: l('Estúdio', 'Studio'), festival: l('Festival', 'Festival'), booking: l('Agência de shows', 'Booking agency') };
type Acc5 = 'none' | 'hat' | 'glasses' | 'both' | 'beard';
const ACC5: Record<Acc5, L> = { none: l('nenhum', 'none'), hat: l('chapéu', 'hat'), glasses: l('óculos', 'glasses'), both: l('chapéu e óculos', 'hat and glasses'), beard: l('barba', 'beard') };
const accOf5 = (a: Appearance): Acc5 => a.hat && a.glasses ? 'both' : a.hat ? 'hat' : a.glasses ? 'glasses' : a.beard ? 'beard' : 'none';

/** Boneco do jogo em tamanho grande (de pé, de frente para a ficha). */
function bigAvatar5(look: Appearance, year: number, role: string | null, z: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.className = 'n5-av';
  try {
    const sp = avatarSprite(look, { year, role: role as never, pose: 'stand', dir: 'SE' });
    cv.width = sp.c.width * z; cv.height = sp.c.height * z;
    const g = cv.getContext('2d');
    if (g) { g.imageSmoothingEnabled = false; g.drawImage(sp.c, 0, 0, cv.width, cv.height); }
  } catch { /* sem canvas (testes) */ }
  return cv;
}

// ---------------------------------------------------------------- prévia "Sua história"

/** Painel da prévia (no mesmo papel): cena da época/cidade/carreira, boneco, resumo e etiquetas. Só lê o rascunho. */
export function preview5(): { el: HTMLElement; update: (cfg: RunConfig) => void } {
  let stage: ReturnType<typeof mountStage5> | null = null;
  const sceneBox = h('div', { class: 'n5-scene' });
  const card = h('div', { class: 'n5-char' });
  const body = h('div', { class: 'n5-story' });
  let key = '';
  const update = (cfg: RunConfig) => {
    const career = cfg.careers?.main?.[0] ?? 'label';
    const look = cfg.character?.look;
    const o = { year: cfg.startYear, city: cfg.homeCity, career, player: look, lang: lang5() };
    const k = JSON.stringify(o);
    if (k !== key) { key = k; if (!stage) { stage = mountStage5(o, 'n5-scene-cv'); sceneBox.replaceChildren(stage.el); } else stage.set(o); }
    const st = story5(cfg, cityName);
    card.replaceChildren(
      h('span', { class: 'n5-char-pic' }, look ? bigAvatar5(look, cfg.startYear, career === 'musician' ? cfg.character?.role ?? null : null, 2) : ''),
      h('span', null, h('b', null, st.name || t(l('(nome gerado)', '(generated name)'))), h('small', null, t(st.who)), st.traits ? h('small', null, t(st.traits)) : null));
    body.replaceChildren(
      h('p', null, `${st.city}, `, h('b', null, String(st.year)), `: ${t(st.era)}. `, t(l('Você começa como', 'You start as')), ' ', h('b', null, t(st.start)), ` — ${t(st.startFx)}`),
      h('p', { class: 'n5-muted' }, t(st.length)),
      h('div', { class: 'n5-tags' }, ...st.tags.map((x) => h('span', { class: 'n5-tag' }, t(x)))),
      ...(st.rolled ? [h('p', { class: 'n5-muted' }, t(l('Começo sorteado', 'Rolled start')), `: "${t(st.rolled)}"`)] : []));
  };
  const el = h('aside', { class: 'n5-paper n5-prev', 'aria-label': t(l('Sua história', 'Your story')) },
    sceneBox,
    h('p', { class: 'n5-cap' }, t(l('a prévia muda na hora com a época, a cidade e a carreira', 'the preview changes as you pick the era, city and career'))),
    h('h3', { class: 'n5-h3' }, t(l('SUA HISTÓRIA', 'YOUR STORY'))),
    card, body);
  return { el, update };
}

// ---------------------------------------------------------------- moldura comum (logo, alternância, fundo)

function frame5(root: HTMLElement, mode: 'quick' | 'full', onQuick: () => void, onFull: () => void, onHome: () => void, ...kids: HTMLElement[]): HTMLElement {
  const bg = mountStage5({ year: 1962, city: 'london', lang: lang5() }, 'n5-bg');
  const tg = (on: boolean, label: L, fn: () => void, id: string) => h('button', { type: 'button', class: `n5-tg ${on ? 'on' : ''}`, 'aria-pressed': on ? 'true' : 'false', 'data-n5': id, onclick: fn }, t(label));
  const el = h('div', { class: `n5 n5-${mode}`, id: 'main', role: 'main', tabindex: '-1' },
    bg.el,
    h('header', { class: 'n5-top' },
      h('button', { type: 'button', class: 'n5-brand', title: t(l('Voltar à tela inicial', 'Back to the title screen')), 'data-n5': 'home', onclick: onHome }, logo5(t(S.gameTitle).toUpperCase()), h('span', null, t(l('1889 – 2040 · UM MUNDO VIVE DE MÚSICA', '1889 – 2040 · A WORLD THAT RUNS ON MUSIC')))),
      h('div', { class: 'n5-toggle', role: 'group', 'aria-label': t(S.newGame) },
        tg(mode === 'quick', l('Começo rápido', 'Quick start'), onQuick, 'quick'),
        tg(mode === 'full', l('Configuração completa', 'Full setup'), onFull, 'full'))),
    ...kids);
  root.replaceChildren(el);
  return el;
}

// ---------------------------------------------------------------- Começo rápido

export function quickRun5Screen(root: HTMLElement, onStart: () => void, q0?: QuickRun5): void {
  const q: QuickRun5 = q0 ?? last5 ?? quickDefaults27(randomSeed(), t(l('Selo Agulha', 'Needle Records')));
  last5 = q;
  const c = (q.char29 ??= charDefaults29(q));
  const prev = preview5();
  const toFull = (tab = 0) => { newGameScreen(root, onStart, quickRun5Config(q), tab); top5(); };
  const err = h('p', { class: 'n5-err', role: 'alert' });
  const refresh = () => { refreshChar29(q); drawWho(); prev.update(quickRun5Config(q)); };

  // ---- 1 · quem é você (editor de personagem)
  const avBox = h('div', { class: 'n5-avbox' });
  const nameIn = h('input', { type: 'text', class: 'n5-name', maxlength: 40, autocomplete: 'off', 'aria-label': t(l('Nome', 'Name')),
    oninput: (e: Event) => { c.name = (e.target as HTMLInputElement).value; c.nameAuto = false; prev.update(quickRun5Config(q)); } }) as HTMLInputElement;
  const rows = h('div', { class: 'n5-rows' });
  const look = (): Appearance => (c.look ??= lookFor29(q.seed, q.startYear, c.sex, c.lk ?? 0));
  const setLook = (patch: Partial<Appearance>) => { const a = { ...look(), ...patch }; delete a.rl; c.look = fitLookToSex(a, c.sex); drawWho(); prev.update(quickRun5Config(q)); };
  const cyc = <T,>(xs: T[], cur: T, d: number): T => xs[((Math.max(0, xs.indexOf(cur)) + d) % xs.length + xs.length) % xs.length];
  const stepRow = (label: L, value: string, fn: (d: number) => void, extra?: HTMLElement | null) => h('div', { class: 'n5-row' },
    h('span', { class: 'n5-k' }, t(label)),
    h('span', { class: 'n5-v' },
      h('button', { type: 'button', class: 'n5-arr', 'aria-label': `${t(label)} −`, onclick: () => fn(-1) }, '◂'),
      h('span', { class: 'n5-val' }, value),
      h('button', { type: 'button', class: 'n5-arr', 'aria-label': `${t(label)} +`, onclick: () => fn(1) }, '▸'),
      extra ?? null));
  const swatch = (label: L, col: string, fn: () => void) => h('button', { type: 'button', class: 'n5-sw', style: `background:${col}`, title: t(label), 'aria-label': t(label), onclick: fn });
  const drawWho = () => {
    const a = look(), yr = q.startYear;
    const role = q.career === 'musician' ? q.art29?.role ?? 'guitar' : null;
    avBox.replaceChildren(bigAvatar5(a, yr, role, 3));
    if (document.activeElement !== nameIn) nameIn.value = c.name;
    const hairs = hairAllowed15(c.sex, yr), outs = outfitAllowed27(c.sex, yr);
    const accs: Acc5[] = c.sex === 'f' ? ['none', 'hat', 'glasses', 'both'] : ['none', 'hat', 'glasses', 'both', 'beard'];
    rows.replaceChildren(
      h('div', { class: 'n5-row' }, h('span', { class: 'n5-k' }, t(l('Nome', 'Name'))), nameIn),
      // pedido do dono: gênero no editor rápido (o mesmo efeito do seletor de "mais opções": nome e visual acompanham)
      stepRow(l('Gênero', 'Gender'), t(SEXES29.find((x) => x.id === c.sex)?.name ?? SEXES29[0].name), (d) => {
        c.sex = cyc(SEXES29.map((x) => x.id), c.sex, d); if (c.look) c.look = fitLookToSex(c.look, c.sex);
        refreshChar29(q); drawWho(); prev.update(quickRun5Config(q)); }),
      stepRow(l('Idade', 'Age'), String(c.age), (d) => { c.age = clampAge29(c.age + d); c.ageAuto = false; drawWho(); prev.update(quickRun5Config(q)); }),
      stepRow(l('Pele', 'Skin'), `${t(l('tom', 'tone'))} ${a.skin + 1}`, (d) => setLook({ skin: (a.skin + d + SKINS.length) % SKINS.length })),
      stepRow(l('Cabelo', 'Hair'), a.hair === 0 ? t(l('careca', 'bald')) : `${t(l('estilo', 'style'))} ${hairs.indexOf(a.hair) + 1} · ${t(HAIRC5[a.hairColor] ?? HAIRC5[0])}`, (d) => setLook({ hair: cyc(hairs, a.hair, d) }),
        swatch(l('Cor do cabelo', 'Hair color'), HAIR_COLORS[a.hairColor] ?? HAIR_COLORS[0], () => setLook({ hairColor: (a.hairColor + 1) % HAIR_COLORS.length }))),
      stepRow(l('Roupa', 'Outfit'), `${t(OUTN5[a.outfit] ?? OUTN5[0])} ${t(OUTC5[a.outfitColor] ?? OUTC5[0])}`, (d) => setLook({ outfit: cyc(outs, a.outfit, d) }),
        swatch(l('Cor da roupa', 'Outfit color'), OUTFIT_COLORS[a.outfitColor] ?? OUTFIT_COLORS[0], () => setLook({ outfitColor: (a.outfitColor + 1) % OUTFIT_COLORS.length }))),
      stepRow(l('Acessório', 'Accessory'), t(ACC5[accOf5(a)]), (d) => { const n = cyc(accs, accOf5(a), d); setLook({ hat: n === 'hat' || n === 'both', glasses: n === 'glasses' || n === 'both', beard: n === 'beard' }); }),
      h('div', { class: 'n5-row n5-acts' }, h('span'),
        h('span', null,
          h('button', { type: 'button', class: 'n5-lk', 'data-n5': 'roll', onclick: () => { c.k = (c.k ?? 0) + 1; c.lk = (c.lk ?? 0) + 1; c.nameAuto = true; c.look = lookFor29(q.seed, q.startYear, c.sex, c.lk); refreshChar29(q); drawWho(); prev.update(quickRun5Config(q)); } }, '⟳ ', t(l('sortear', 'roll'))),
          ' · ',
          h('button', { type: 'button', class: 'n5-lk', 'data-n5': 'more', onclick: () => moreChar() }, t(l('mais opções', 'more options')), ' ▸'))));
  };
  // "mais opções": sexo (também no editor rápido), instrumentos e banda (artista) e o editor de aparência completo do jogo
  const moreChar = () => {
    const blk = quickCharBlock29(q, () => undefined);
    const fake = { id: 'player-new', role: (q.art29?.role ?? 'guitar') as never, look: look() };
    const lookEd = h('div', { class: 'n5-looked' });
    const drawEd = () => lookEd.replaceChildren(appearanceEditor(fake, (a) => { c.look = a ?? lookFor29(q.seed, q.startYear, c.sex, c.lk ?? 0); fake.look = c.look; }, q.startYear, c.sex));
    drawEd();
    blk.el.addEventListener('change', (e) => { if ((e.target as HTMLElement).id === 'c29-sex') { fake.look = look(); drawEd(); } });
    modal(t(l('Seu personagem', 'Your character')), h('div', { class: 'n5-more' }, blk.el, lookEd), { wide: true, onClose: () => { drawWho(); refresh(); } });
  };

  // ---- 2 · onde + traço
  const cities = [...CITIES].sort((a, b) => cityName(a.id).localeCompare(cityName(b.id)));
  const citySel = select(q.homeCity, cities.map((x) => ({ value: x.id, label: `${cityName(x.id)}${x.a3 ? ` · ${x.a3}` : ''}` })), (v) => { q.homeCity = v; if (q.art29 && q.art29.genre === undefined) q.art29.genreK = undefined; refresh(); }, { class: 'n5-field', 'aria-label': t(S.homeCity), 'data-n5': 'city' });
  const traitBox = h('div', { class: 'n5-seg', role: 'radiogroup', 'aria-label': t(l('Traço de personalidade', 'Personality trait')) });
  const drawTraits = () => traitBox.replaceChildren(...TRAITS5.map((id) => {
    const on = q.trait5 === id, d = playerTraitById[id];
    return h('button', { type: 'button', role: 'radio', class: on ? 'on' : '', 'aria-checked': String(on), title: t(d.desc), onclick: () => { q.trait5 = on ? undefined : id; drawTraits(); prev.update(quickRun5Config(q)); } }, t(d.name));
  }));
  drawTraits();

  // ---- 3 · carreira
  const careerBox = h('div', { class: 'n5-careers', role: 'radiogroup', 'aria-label': t(l('O que você faz', 'What you do')) });
  const drawCareers = () => {
    if (!careerOpen27(q.career, q.startYear)) q.career = 'label';
    careerBox.replaceChildren(...PRIMARY5.map((id) => {
      const d = careerDef(id)!, open = careerOpen27(id, q.startYear), on = q.career === id;
      return h('button', { type: 'button', role: 'radio', class: `n5-car ${on ? 'on' : ''}`, 'aria-checked': String(on), disabled: !open, 'data-career': id,
        title: open ? `${t(d.name)} — ${t(d.desc)}` : t(l('Abre em {y}', 'Opens in {y}'), { y: d.from }),
        onclick: () => { q.career = id; drawCareers(); refresh(); } }, ic(d.icon, 2), h('span', null, t(CAR5[id] ?? CAREER_SHORT27[id] ?? d.name)));
    }));
    if (!(PRIMARY5 as readonly string[]).includes(q.career)) careerBox.append(h('p', { class: 'n5-muted' }, t(l('Na configuração completa: {c}', 'From the full setup: {c}'), { c: t(careerDef(q.career)?.name ?? l('', '')) })));
  };

  // ---- 4 · quando (régua das eras)
  const yearIn = h('input', { type: 'number', class: 'n5-yearin', min: YEAR_MIN20, max: YEAR_MAX20, value: q.startYear, 'aria-label': t(S.startYear),
    onchange: (e: Event) => { const v = Number((e.target as HTMLInputElement).value); if (!(v >= YEAR_MIN20 && v <= YEAR_MAX20)) { err.textContent = t(l('Escolha um ano entre {a} e {b}.', 'Pick a year between {a} and {b}.'), { a: YEAR_MIN20, b: YEAR_MAX20 }); yearIn.value = String(q.startYear); return; } setYear(v); } }) as HTMLInputElement;
  const ruler = h('input', { type: 'range', class: 'n5-ruler', min: YEAR_MIN20, max: YEAR_MAX20, step: 1, value: q.startYear, 'aria-label': t(S.startYear), 'data-n5': 'year',
    oninput: (e: Event) => setYear(Number((e.target as HTMLInputElement).value)) }) as HTMLInputElement;
  const pct = (y: number) => ((y - YEAR_MIN20) / (YEAR_MAX20 - YEAR_MIN20)) * 100;
  const eras = h('div', { class: 'n5-eras' }, ...ERAS5.map((e) => h('button', { type: 'button', class: 'n5-era', style: `left:${pct(e.y)}%`, onclick: () => setYear(e.y) }, `${e.y} ${t(e.name)}`)));
  const ticks = h('div', { class: 'n5-ticks', 'aria-hidden': 'true' }, ...ERAS5.map((e) => h('i', { style: `left:${pct(e.y)}%` })));
  const setYear = (v: number) => {
    err.textContent = '';
    const dur = durOf5(q);
    q.startYear = clampYear27(v);
    if (q.art29 && q.art29.genre === undefined) q.art29.genreK = undefined;
    if (dur === 'y2040') q.runYears = yearsOfDur5('y2040', q.startYear);
    yearIn.value = String(q.startYear); ruler.value = String(q.startYear);
    drawCareers(); drawDur(); refresh();
  };

  // ---- 5 · tamanho, 6 · dificuldade, 7 · duração
  const seg = <T extends string>(id: string, opts: { v: T; name: L; cls?: string; off?: boolean }[], cur: () => T | null, set: (v: T) => void, label: L) => {
    const box = h('div', { class: 'n5-seg', role: 'radiogroup', 'aria-label': t(label), 'data-n5': id });
    const draw = () => box.replaceChildren(...opts.map((o) => h('button', { type: 'button', role: 'radio', class: `${cur() === o.v ? 'on' : ''} ${o.cls ?? ''}`, 'aria-checked': String(cur() === o.v), disabled: !!o.off, 'data-v': o.v,
      onclick: () => { set(o.v); draw(); prev.update(quickRun5Config(q)); } }, t(o.name))));
    draw();
    return { el: box, draw };
  };
  const sitNow = () => q.start29 ?? sitOfScenario29(q.scenario);
  const size = seg('size', SIZES5.map((v) => ({ v, name: SIZE_NAME5[v], cls: v === 'fallen' ? 'red' : '' })), () => sitNow(), (v) => { q.start29 = v; q.scenario = sit29ById(v)!.base; refreshChar29(q); drawWho(); }, l('Tamanho do começo', 'Starting size'));
  const diff = seg<RunConfig['difficulty']>('diff', [{ v: 'easy', name: l('Tranquila', 'Relaxed') }, { v: 'normal', name: l('Equilibrada', 'Balanced') }, { v: 'hard', name: l('Dura', 'Hard') }], () => q.difficulty, (v) => { q.difficulty = v; }, S.difficulty);
  const durBox = h('div');
  const drawDur = () => durBox.replaceChildren(seg<Dur5>('dur', [{ v: 'rec', name: l('25 anos', '25 years') }, { v: 'y2040', name: l('Até 2040', 'Until 2040'), off: q.startYear >= 2040 }, { v: 'none', name: l('Sem fim', 'No end') }], () => durOf5(q), (v) => { q.runYears = yearsOfDur5(v, q.startYear); }, l('Duração', 'Length')).el);
  drawDur();

  // ---- interruptores
  const sw = (id: string, label: L, get: () => boolean, set: (v: boolean) => void) => {
    const b = h('button', { type: 'button', role: 'switch', class: 'n5-sw2', 'data-n5': id }) as HTMLButtonElement;
    const draw = () => { const on = get(); b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on); };
    b.onclick = () => { set(!get()); draw(); prev.update(quickRun5Config(q)); };
    draw();
    return h('label', { class: 'n5-swrow' }, b, h('span', null, t(label)));
  };
  const real = sw('real', l('Nomes reais (artistas, gravadoras, obras)', 'Real names (acts, labels, works)'), () => realOn5(quickRun5Config(q)), (v) => { q.real5 = v; });
  const hist = sw('hist', l('Mundo segue a história real', 'World follows real history'), () => histOn5(quickRun5Config(q)), (v) => { q.hist5 = v; });
  const tut = tut5Enabled() ? sw('tut', l('Tutorial guiado (mentor da época)', 'Guided tutorial (era mentor)'), () => !!tutQ5.on, (v) => { tutQ5.on = v; }) : null;

  // ---- começar
  let busy = false;
  const go = h('button', { type: 'button', class: 'n5-go', 'data-n5': 'start', onclick: () => {
    if (busy) return;
    busy = true; err.textContent = ''; go.disabled = true; go.textContent = t(l('Gerando seu mundo…', 'Generating your world…'));
    setTimeout(() => {
      try { const cfg = quickRun5Config(q); if (tutQ5.on && tut5Enabled()) cfg.tut5 = { from: 'quick' }; launchRun27(cfg, onStart); } catch (e) {
        console.error(e);
        busy = false; go.disabled = false; go.textContent = goLabel();
        err.textContent = t(l('Não foi possível gerar o mundo ({e}). Suas escolhas continuam; tente de novo.', 'Could not generate the world ({e}). Your choices are kept; try again.'), { e: String((e as Error)?.message ?? e).slice(0, 120) });
      }
    }, 30);
  } }) as HTMLButtonElement;
  const goLabel = () => t(l('COMEÇAR MINHA HISTÓRIA', 'START MY STORY'));
  go.textContent = goLabel();
  const runCode = () => { const cfg = quickRun5Config(q); pasteCode20(cfg, () => newGameScreen(root, onStart, cfg, 5)); };
  const more = careerDefs().length - PRIMARY5.length;
  const lab = (n: string, title: L, aside?: HTMLElement | string) => h('div', { class: 'n5-lab' }, h('span', null, `${n} · ${t(title).toUpperCase()}`), aside ? h('i', null, aside) : null);

  drawWho(); drawCareers();
  const clip = h('section', { class: 'n5-paper n5-clip', 'aria-label': t(l('Ficha de inscrição', 'Sign-up form')) },
    h('h2', { class: 'n5-h2' }, t(l('FICHA DE INSCRIÇÃO', 'SIGN-UP FORM'))),
    h('p', { class: 'n5-sub' }, t(l('As escolhas principais. O resto vem pronto e pode ser mudado na configuração completa.', 'The main choices. Everything else comes ready and can be changed in the full setup.'))),
    h('div', { class: 'n5-2' },
      h('div', null, lab('1', l('Quem é você', 'Who you are'), t(l('editor de personagem', 'character editor'))),
        h('div', { class: 'n5-who' }, avBox, rows)),
      h('div', null, lab('2', l('Onde', 'Where'), t(l('cidade inicial', 'starting city'))), citySel,
        h('div', { class: 'n5-lab n5-mt' }, h('span', null, t(l('TRAÇO DE PERSONALIDADE', 'PERSONALITY TRAIT'))), h('i', null, t(l('opcional', 'optional')))), traitBox,
        h('p', { class: 'n5-note' }, t(l('Histórico, atributos e família ficam na configuração completa.', 'Background, attributes and family are in the full setup.'))))),
    h('div', { class: 'n5-blk' }, lab('3', l('O que você faz', 'What you do'), h('button', { type: 'button', class: 'n5-lk2', onclick: () => toFull(2) }, t(l('+ {n} carreiras na completa', '+ {n} careers in the full setup'), { n: more }))), careerBox),
    h('div', { class: 'n5-blk' }, lab('4', l('Quando', 'When'), h('span', null, t(l('ano de início', 'start year')), ': ', yearIn)),
      h('div', { class: 'n5-rulerbox' }, ticks, ruler), eras),
    h('div', { class: 'n5-blk' }, lab('5', l('Tamanho do começo', 'Starting size')), size.el),
    h('div', { class: 'n5-2 n5-blk' },
      h('div', null, lab('6', S.difficulty), diff.el),
      h('div', null, lab('7', l('Duração', 'Length')), durBox)),
    h('div', { class: 'n5-2 n5-blk' }, real, hist),
    tut ? h('div', { class: 'n5-blk' }, tut) : null,
    err,
    go,
    h('div', { class: 'n5-links' },
      h('button', { type: 'button', class: 'n5-lk2', 'data-n5': 'full', onclick: () => toFull(0) }, t(l('Configuração completa', 'Full setup')), ' →'),
      h('button', { type: 'button', class: 'n5-lk2', onclick: () => scenarioScreen(root, onStart, () => quickRun5Screen(root, onStart, q)) }, t(l('Cenários históricos', 'Historical scenarios'))),
      h('button', { type: 'button', class: 'n5-lk2', onclick: runCode }, t(l('Usar código de run', 'Use a run code'))),
      h('button', { type: 'button', class: 'n5-lk2', onclick: () => backHome5(root, onStart, true) }, t(l('Carregar partida', 'Load a run')))));
  frame5(root, 'quick', () => undefined, () => toFull(0), () => backHome5(root, onStart), h('div', { class: 'n5-grid' }, clip, prev.el));
  prev.update(quickRun5Config(q));
  top5();
}

/** Volta à tela inicial (com o "Carregar" aberto, se pedido). */
function backHome5(root: HTMLElement, onStart: () => void, load = false): void {
  void import('./home5').then((m) => { m.homeScreen5(root, onStart); if (load) (root.querySelector('[data-h5="load"]') as HTMLButtonElement | null)?.click(); });
}

// ---------------------------------------------------------------- Configuração completa (pele da tela de sempre)

export interface NgParts31 {
  root: HTMLElement; onStart: () => void; cfg: RunConfig; wrap: HTMLElement;
  tabBtns: HTMLElement[]; panels: HTMLElement[]; go: (i: number) => void; cur: () => number;
}
const STEP5: L[] = [l('Mundo', 'World'), l('Personagem', 'Character'), l('Carreiras', 'Careers'), l('Gravadoras', 'Labels'), l('Regras e ritmo', 'Rules and rhythm'), l('Revisão', 'Review')];

/** Veste a configuração completa de prancheta: etapas como marcadores à esquerda, conteúdo no papel, prévia à
 *  direita, teclas { e }. Todos os cartões e controles continuam os mesmos (nenhuma opção some). */
export function skin5(p: NgParts31): { after: (cur: number) => void } {
  const { root, onStart, cfg, wrap, tabBtns, panels, go, cur } = p;
  const prev = preview5();
  wrap.classList.add('n5-ng');
  const tabs = wrap.querySelector<HTMLElement>('.ng-tabs')!;
  const main = wrap.querySelector<HTMLElement>('.ng-main')!;
  const side = wrap.querySelector<HTMLElement>('.ng-side')!;
  const back = wrap.querySelector<HTMLElement>(':scope > header');
  const presets = wrap.querySelector<HTMLElement>(':scope > .ng17-presets');
  tabBtns.forEach((b, i) => { const tl = b.querySelector('.ng21-tl b'); if (tl) tl.textContent = `${i + 1} · ${t(STEP5[i] ?? l('', '')).toUpperCase()}`; });
  const rail = h('nav', { class: 'n5-rail', 'aria-label': t(l('Etapas', 'Steps')) }, tabs,
    h('p', { class: 'n5-keys' }, h('kbd', null, '{'), ' ', h('kbd', null, '}'), ' ', t(l('etapa anterior / próxima', 'previous / next step'))));
  const title = h('h2', { class: 'n5-h2' });
  const clip = h('section', { class: 'n5-paper n5-clip n5-clipfull' }, title, main);
  if (presets) { const d = h('details', { class: 'n5-presets' }, h('summary', null, t(l('Atalhos de configuração', 'Configuration shortcuts')))); d.append(presets); main.prepend(d); }
  side.classList.add('n5-side');
  side.prepend(prev.el);
  const layout = wrap.querySelector<HTMLElement>('.ng-layout')!;
  layout.replaceChildren(rail, clip, side);
  const q = last5;
  const frame = frame5(root, 'full', () => { quickRun5Screen(root, onStart, q ?? undefined); }, () => undefined, () => backHome5(root, onStart), wrap);
  if (back) back.style.display = 'none';
  const refresh = () => prev.update(cfg);
  for (const ev of ['input', 'change', 'click']) wrap.addEventListener(ev, () => queueMicrotask(refresh));
  const onKey = (e: KeyboardEvent) => {
    if (!frame.isConnected) { document.removeEventListener('keydown', onKey); return; }
    const tg = e.target as HTMLElement;
    if (tg.closest?.('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '{' || e.key === '}') { e.preventDefault(); go(Math.max(0, Math.min(panels.length - 1, cur() + (e.key === '}' ? 1 : -1)))); }
  };
  document.addEventListener('keydown', onKey);
  refresh();
  return { after: (i) => { title.textContent = `${i + 1} · ${t(STEP5[i] ?? l('', '')).toUpperCase()}`; refresh(); } };
}
