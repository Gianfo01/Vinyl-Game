// Editor de aparência (cosmético, sem custo): prévia ao vivo em pixel art + controles por parte.

import { l } from '../../data/world';
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
  m: { hair: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15], outfit: [0, 1, 3], beard: true },
  f: { hair: [1, 2, 5, 6, 7, 8, 9, 10, 12, 13, 15], outfit: [0, 1, 2, 3], beard: false },
  x: { hair: ALL_HAIR, outfit: [0, 1, 2, 3], beard: true },
};

/** Ajusta uma aparência às opções válidas para o sexo. */
export function fitLookToSex(look: Appearance, sex: Sex = 'x'): Appearance {
  const a = ALLOWED[sex];
  const near = (v: number, list: number[]) => (list.includes(v) ? v : list.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b), list[0]));
  return { ...look, hair: near(look.hair, a.hair), outfit: near(look.outfit, a.outfit), beard: a.beard && look.beard };
}

/**
 * Componente DOM do editor. `onChange` recebe a nova aparência a cada ajuste
 * (ou `undefined` ao restaurar a aparência padrão derivada do id).
 */
export function appearanceEditor(person: EditablePerson, onChange: (look: Appearance | undefined) => void, year = 1960, sex: Sex = 'x'): HTMLElement {
  const allow = ALLOWED[sex];
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
      h('div', { class: 'row' },
        h('button', { class: 'btn small', onclick: () => update(randomLook(`${person.id}:${Math.random().toString(36).slice(2)}`)) }, '🎲 ', t(l('Aleatório', 'Randomize'))),
        h('button', { class: 'btn small ghost', onclick: () => update({}, true) }, t(l('Restaurar padrão', 'Reset to default'))),
      ),
      h('p', { class: 'muted small' }, t(l(`Aparência é só cosmética, sem custo. A roupa segue a moda de ${eraOf(year).slice(0, 3)}0s.`, `Looks are cosmetic only, free of charge. Clothes follow ${eraOf(year).slice(0, 3)}0s fashion.`))),
    );
  };
  drawPortrait();
  drawBody();
  renderControls();
  return h('div', { class: 'look-editor' }, h('div', { class: 'look-preview' }, portraitBox, body), controls);
}
