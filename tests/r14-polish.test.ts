// Rodada 14 (polimento): textos com artigo, nomes legíveis no lugar de ids e tutorial por carreira.
import { describe, expect, it } from 'vitest';
import '../src/sim/bot';
import { l } from '../src/data/world';
import { SPOT14, SPOTS14 } from '../src/sim/sys/leisure14';
import { atPlace14, tagName14 } from '../src/sim/sys/polish14';
import { tutorialIntro14 } from '../src/ui/tutorial14';

describe('polimento r14', () => {
  it('lugar com artigo: nunca "em Bar da esquina"', () => {
    expect(atPlace14(l('Bar da esquina', 'Corner bar'))).toEqual(l('no bar da esquina', 'at the corner bar'));
    expect(atPlace14(l('Boate', 'Nightclub')).pt).toBe('na boate');
    expect(atPlace14(l('Igreja / templo', 'Church / temple')).pt).toBe('na igreja / templo');
    expect(atPlace14(l('Em casa', 'At home'))).toEqual(l('em casa', 'at home'));
    expect(atPlace14(l('Lan house', 'LAN café')).en).toBe('at the LAN café');
    for (const k of SPOTS14) for (const y of [1960, 1985, 2020]) {
      const a = atPlace14(SPOT14[k].name(y));
      expect(a.pt).toMatch(/^(no|na|em) [a-zçé]/);
      expect(a.en).toMatch(/^at /);
    }
  });
  it('etiquetas de censura e famílias viram nomes, sem sublinhado', () => {
    expect(tagName14('regional_language').pt).toBe('línguas regionais');
    expect(tagName14('blues_jazz').pt).toBe('Blues e jazz');
    expect(tagName14('classic_blues').en).toBe('Classic blues');
    expect(tagName14('weird_tag').pt).toBe('weird tag');
  });
  it('tutorial: sede só para o selo; outras carreiras começam na sua casa', () => {
    expect(tutorialIntro14(['label']).title.pt).toContain('sede');
    expect(tutorialIntro14(['manager', 'label']).area).toBe('hq');
    const m = tutorialIntro14(['manager']);
    expect(m.title.pt).not.toContain('sede');
    expect(m.area).toBe('management');
    expect(tutorialIntro14(['musician']).area).toBe('artists');
    expect(tutorialIntro14([]).area).toBe('hq');
  });
});
