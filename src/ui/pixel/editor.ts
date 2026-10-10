// Editor de aparência (cosmético, sem custo): prévia ao vivo em pixel art + controles por parte.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Appearance, Person } from '../../sim/types';
import { h } from '../dom';
import { AV_H, AV_W, HAIR_COLORS, HAIR_STYLES, OUTFIT_COLORS, SKINS, avatarSprite, lookOf, portraitCanvas, randomLook, variantOf, type Dir } from './avatar';
import { eraOf } from './palette';

const OUTFITS = [l('Casual', 'Casual'), l('Social', 'Formal'), l('Vestido / casaco', 'Dress / coat'), l('Malha / moletom', 'Knit / hoodie')];
const BODIES = [l('Magro', 'Slim'), l('Médio', 'Average'), l('Robusto', 'Sturdy')];
const FACES = [l('Sereno', 'Calm'), l('Marcante', 'Strong'), l('Alegre', 'Cheerful')];

type EditablePerson = Pick<Person, 'id' | 'role'> & { look?: Appearance };

/** Rodada 9: sexo do personagem filtra cabelos, roupas e barba ('x' = todas as opções). */
export type Sex = 'm' | 'f' | 'x';
const ALL_HAIR = Array.from({ length: HAIR_STYLES }, (_, i) => i);
const ALLOWED: Record<Sex, { hair: number[]; outfit: number[]; beard: boolean }> = {
  m: { hair: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 18, 20, 21], outfit: [0, 1, 2, 3], beard: true },
  f: { hair: [1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22], outfit: [0, 1, 2, 3], beard: false },
  x: { hair: ALL_HAIR, outfit: [0, 1, 2, 3], beard: true },
};

/** Ajusta uma aparência às opções válidas para o sexo. */
export function fitLookToSex(look: Appearance, sex: Sex = 'x'): Appearance {
  const a = ALLOWED[sex];
  const near = (v: number, list: number[]) => (list.includes(v) ? v : list.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b), list[0]));
  return { ...look, hair: near(look.hair, a.hair), outfit: near(look.outfit, a.outfit), beard: a.beard && look.beard, sx: sex === 'x' ? look.sx : sex };
}

// Rodada 15: peças novas (visuais de artistas reais) com ano mínimo — nada aparece antes de existir.
const HAIR_FROM: Record<number, number> = { 11: 1975, 16: 1975, 21: 1970, 22: 1985 };
const HATS15: [L, number][] = [[l('da época', 'era default'), 0], [l('cartola', 'top hat'), 0], [l('caubói', 'cowboy'), 0], [l('boina', 'beret'), 0], [l('gorro', 'beanie'), 0], [l('faixa na testa', 'headband'), 1965], [l('boné', 'cap'), 1975], [l('fedora', 'fedora'), 0], [l('bandana', 'bandana'), 1970]];
const GLASSES15: [L, number][] = [[l('comuns', 'plain'), 0], [l('redondos', 'round'), 0], [l('escuros', 'shades'), 0], [l('extravagantes', 'flamboyant'), 1970]];
const BEARDS15: [L, number][] = [[l('cheia', 'full'), 0], [l('bigode', 'mustache'), 0], [l('cavanhaque', 'goatee'), 0], [l('por fazer', 'stubble'), 0]];
const PAINT15: [L, number][] = [[l('nenhuma', 'none'), 0], [l('estrela', 'star'), 1973], [l('demônio', 'demon'), 1973], [l('gato', 'cat'), 1973], [l('espacial', 'spaceman'), 1973], [l('raio', 'lightning bolt'), 1973], [l('delineado glam', 'glam liner'), 0], [l('máscara branca', 'white mask'), 1970]];
const HELM15: [L, number][] = [[l('nenhum', 'none'), 0], [l('robô prateado', 'silver robot'), 1995], [l('robô dourado', 'gold robot'), 1995]];
/** Opções liberadas no ano (índices). */
export const opts15 = (list: [L, number][], year: number): number[] => list.map((x, i) => (x[1] <= year ? i : -1)).filter((i) => i >= 0);
export const hairAllowed15 = (sex: Sex, year: number): number[] => ALLOWED[sex].hair.filter((v) => (HAIR_FROM[v] ?? 0) <= year);

/**
 * Componente DOM do editor. `onChange` recebe a nova aparência a cada ajuste
 * (ou `undefined` ao restaurar a aparência padrão derivada do id).
 */
export function appearanceEditor(person: EditablePerson, onChange: (look: Appearance | undefined) => void, year = 1960, sex: Sex = 'x'): HTMLElement {
  const allow = { ...ALLOWED[sex], hair: hairAllowed15(sex, year) };
  let look: Appearance = fitLookToSex(lookOf(person), sex);
  if (sex !== 'x' && JSON.stringify(look) !== JSON.stringify(lookOf(person))) onChange({ ...look });
  const reduced = document.documentElement.classList.contains('reduced-motion');
  const portraitBox = h('div', { class: 'look-portrait' });
  const body = document.createElement('canvas');
  const Z = 4;
  body.width = AV_W * Z;
  body.height = AV_H * Z;
  body.className = 'px';
  const bctx = body.getContext('2d')!;
  bctx.imageSmoothingEnabled = false;
  const dirs: Dir[] = ['SE', 'SW', 'NW', 'NE'];
  let tick = 0;
  const drawBody = () => {
    const dir = dirs[Math.floor(tick / 16) % 4];
    const frame = tick % 4;
    const sp = avatarSprite(look, { year, role: person.role, pose: reduced ? 'stand' : 'walk', dir: reduced ? 'SE' : dir, frame, variant: variantOf(person.id) });
    bctx.clearRect(0, 0, body.width, body.height);
    bctx.fillStyle = 'rgba(0,0,0,0.25)';
    bctx.fillRect((sp.ax - 6) * Z, (sp.ay) * Z, 12 * Z, Z);
    bctx.drawImage(sp.c, 0, 0, sp.c.width * Z, sp.c.height * Z);
  };
  const drawPortrait = () => portraitBox.replaceChildren(portraitCanvas({ ...person, look }, year, 4));
  const timer = reduced ? 0 : window.setInterval(() => {
    if (!body.isConnected && tick > 4) { window.clearInterval(timer); return; }
    tick++;
    drawBody();
  }, 160);
  const controls = h('div', { class: 'look-controls' });
  const update = (patch: Partial<Appearance>, reset = false) => {
    look = fitLookToSex(reset ? { ...lookOf({ id: person.id }) } : { ...look, ...patch }, sex);
    if (!reset) delete look.rl; // editado pelo jogador: o visual real automático não volta a sobrescrever
    onChange(reset ? undefined : { ...look });
    drawPortrait();
    drawBody();
    renderControls();
  };
  const stepper = (label: string, key: 'body' | 'face' | 'hair' | 'outfit', n: number | number[], name: (v: number) => string) => {
    const opts = Array.isArray(n) ? n : Array.from({ length: n }, (_, i) => i);
    const step = (d: number) => { const i = Math.max(0, opts.indexOf(look[key])); update({ [key]: opts[(i + d + opts.length) % opts.length] } as Partial<Appearance>); };
    return h('div', { class: 'look-row' }, h('span', null, label),
      h('span', { class: 'look-step' },
        h('button', { class: 'btn small ghost', 'aria-label': `${label} −`, onclick: () => step(-1) }, '◀'),
        h('span', null, name(look[key])),
        h('button', { class: 'btn small ghost', 'aria-label': `${label} +`, onclick: () => step(1) }, '▶'),
      ));
  };
  const swatches = (label: string, key: 'skin' | 'hairColor' | 'outfitColor', colors: string[]) =>
    h('div', { class: 'look-row' }, h('span', null, label),
      h('span', { class: 'swatches', role: 'radiogroup', 'aria-label': label }, colors.map((c, i) => h('button', {
        class: `swatch ${look[key] === i ? 'on' : ''}`, style: `background:${c}`, role: 'radio', 'aria-checked': look[key] === i ? 'true' : 'false', 'aria-label': `${label} ${i + 1}`, onclick: () => update({ [key]: i } as Partial<Appearance>),
      }))));
  type K15 = 'hatT' | 'glT' | 'bdT' | 'paint' | 'helm';
  const pick15 = (label: string, key: K15, list: [L, number][]) => {
    const o = opts15(list, year);
    const cur = look[key] ?? 0;
    const step = (d: number) => { const i = Math.max(0, o.indexOf(cur)); const v = o[(i + d + o.length) % o.length]; update({ [key]: v || undefined } as Partial<Appearance>); };
    return h('div', { class: 'look-row' }, h('span', null, label),
      h('span', { class: 'look-step' },
        h('button', { class: 'btn small ghost', 'aria-label': `${label} −`, onclick: () => step(-1) }, '◀'),
        h('span', null, t(list[cur]?.[0] ?? list[0][0])),
        h('button', { class: 'btn small ghost', 'aria-label': `${label} +`, onclick: () => step(1) }, '▶'),
      ));
  };
  const toggle = (label: string, key: 'glasses' | 'hat' | 'beard') =>
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: look[key], onchange: (e: Event) => update({ [key]: (e.target as HTMLInputElement).checked } as Partial<Appearance>) }), label);
  const renderControls = () => {
    controls.replaceChildren(
      stepper(t(l('Corpo', 'Body')), 'body', 3, (v) => t(BODIES[v])),
      stepper(t(l('Rosto', 'Face')), 'face', 3, (v) => t(FACES[v])),
      swatches(t(l('Pele', 'Skin')), 'skin', SKINS),
      stepper(t(l('Cabelo', 'Hair')), 'hair', allow.hair, (v) => (v === 0 ? t(l('careca', 'bald')) : `${allow.hair.indexOf(v) + 1}/${allow.hair.length}`)),
      swatches(t(l('Cor do cabelo', 'Hair color')), 'hairColor', HAIR_COLORS),
      stepper(t(l('Roupa', 'Outfit')), 'outfit', allow.outfit, (v) => t(sex === 'm' && v === 2 ? l('Casaco longo', 'Long coat') : OUTFITS[v])),
      swatches(t(l('Cor da roupa', 'Outfit color')), 'outfitColor', OUTFIT_COLORS),
      h('div', { class: 'look-toggles' }, toggle(t(l('Óculos', 'Glasses')), 'glasses'), toggle(t(l('Chapéu', 'Hat')), 'hat'), allow.beard ? toggle(t(l('Barba', 'Beard')), 'beard') : null),
      h('div', { class: 'look-extra15' },
      look.hat ? pick15(t(l('Tipo de chapéu', 'Hat style')), 'hatT', HATS15) : null,
      look.hat && look.hatT ? h('div', { class: 'look-row' }, h('span', null, t(l('Cor do chapéu', 'Hat color'))),
        h('span', { class: 'swatches' }, OUTFIT_COLORS.map((c, i) => h('button', { class: `swatch ${look.hatC === i ? 'on' : ''}`, style: `background:${c}`, 'aria-label': `${t(l('Cor do chapéu', 'Hat color'))} ${i + 1}`, onclick: () => update({ hatC: i }) })))) : null,
      look.glasses ? pick15(t(l('Tipo de óculos', 'Glasses style')), 'glT', GLASSES15) : null,
      look.beard && allow.beard ? pick15(t(l('Tipo de barba', 'Beard style')), 'bdT', BEARDS15) : null,
      pick15(t(l('Maquiagem / pintura', 'Makeup / face paint')), 'paint', PAINT15),
      opts15(HELM15, year).length > 1 ? pick15(t(l('Capacete', 'Helmet')), 'helm', HELM15) : null),
      h('div', { class: 'row' },
        h('button', { class: 'btn small', onclick: () => update(randomLook(`${person.id}:${Math.random().toString(36).slice(2)}`)) }, '🎲 ', t(l('Aleatório', 'Randomize'))),
        h('button', { class: 'btn small ghost', onclick: () => update({}, true) }, t(l('Restaurar padrão', 'Reset to default'))),
      ),
      look.rl ? h('p', { class: 'small' }, t(l(`Visual inspirado na fase real (${look.rl.split('@')[1] === '0' ? 'início' : look.rl.split('@')[1]}). Ele muda sozinho quando a fase muda — até você editar algo aqui.`, `Look based on the real era (${look.rl.split('@')[1] === '0' ? 'early' : look.rl.split('@')[1]}). It changes by itself with each phase — until you edit something here.`))) : h('span'),
      h('p', { class: 'muted small' }, t(l(`Mudar o visual não custa nada. Tom de pele, sexo e idade pesam no jogo conforme o país e a época (Você → Aparência). A roupa segue a moda de ${eraOf(year).slice(0, 3)}0s.`, `Changing your look is free. Skin tone, sex and age weigh in the game by country and era (You → Appearance). Clothes follow ${eraOf(year).slice(0, 3)}0s fashion.`))),
    );
  };
  drawPortrait();
  drawBody();
  renderControls();
  return h('div', { class: 'look-editor' }, h('div', { class: 'look-preview' }, portraitBox, body), controls);
}
