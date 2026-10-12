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
  it('tutorial: o passo 1 fala da carreira principal; r27: toda carreira começa na Sede › Sua sede', () => {
    expect(tutorialIntro14(['label']).title.pt).toContain('sede'); // r27 (antes r23: Cockpit)
    expect(tutorialIntro14(['manager', 'label']).area).toBe('sede25');
    const m = tutorialIntro14(['manager']);
    expect(m.title.pt).not.toContain('sede'); // o título continua sendo do ofício
    expect(m.area).toBe('sede25');
    expect(m.page).toBe('management'); // a casa da carreira segue conhecida (a um clique no menu)
    expect(tutorialIntro14(['musician']).page).toBe('artists');
    expect(tutorialIntro14([]).area).toBe('sede25');
  });
});
