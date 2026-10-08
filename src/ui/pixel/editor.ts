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

/**
 * Componente DOM do editor. `onChange` recebe a nova aparência a cada ajuste
 * (ou `undefined` ao restaurar a aparência padrão derivada do id).
 */
export function appearanceEditor(person: EditablePerson, onChange: (look: Appearance | undefined) => void, year = 1960): HTMLElement {
  let look: Appearance = { ...lookOf(person) };
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
    look = reset ? { ...lookOf({ id: person.id }) } : { ...look, ...patch };
    onChange(reset ? undefined : { ...look });
    drawPortrait();
    drawBody();
    renderControls();
  };
  const stepper = (label: string, key: 'body' | 'face' | 'hair' | 'outfit', n: number, name: (v: number) => string) =>
    h('div', { class: 'look-row' }, h('span', null, label),
      h('span', { class: 'look-step' },
        h('button', { class: 'btn small ghost', 'aria-label': `${label} −`, onclick: () => update({ [key]: (look[key] + n - 1) % n } as Partial<Appearance>) }, '◀'),
        h('span', null, name(look[key])),
        h('button', { class: 'btn small ghost', 'aria-label': `${label} +`, onclick: () => update({ [key]: (look[key] + 1) % n } as Partial<Appearance>) }, '▶'),
      ));
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
      stepper(t(l('Cabelo', 'Hair')), 'hair', HAIR_STYLES, (v) => (v === 0 ? t(l('careca', 'bald')) : `${v}/${HAIR_STYLES - 1}`)),
      swatches(t(l('Cor do cabelo', 'Hair color')), 'hairColor', HAIR_COLORS),
      stepper(t(l('Roupa', 'Outfit')), 'outfit', 4, (v) => t(OUTFITS[v])),
      swatches(t(l('Cor da roupa', 'Outfit color')), 'outfitColor', OUTFIT_COLORS),
      h('div', { class: 'look-toggles' }, toggle(t(l('Óculos', 'Glasses')), 'glasses'), toggle(t(l('Chapéu', 'Hat')), 'hat'), toggle(t(l('Barba', 'Beard')), 'beard')),
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
