// BUGS33 · pedido 8 — o 2º botão do menu de baixo é a ação principal da carreira (gravadora: Artistas) e as teclas
// ⇧1…⇧6 seguem a ordem do menu (Sede, carreira, Casa, Cidade, Mundo, Celular), sem conflito.
import { describe, expect, it } from 'vitest';
import { DOCK_CAR5, dockCar5 } from '../src/ui/r31/dockcar5';
import { CAREER_PAGE17 } from '../src/ui/nav17';
import { bindOf5, conflicts5 } from '../src/ui/r31/keys5';
import '../src/ui/r31/objects5';

describe('BUGS33 · botão da carreira no menu de baixo', () => {
  it('cada carreira tem a sua ação; a gravadora vai à gestão de artistas', () => {
    for (const c of Object.keys(CAREER_PAGE17)) expect(DOCK_CAR5[c], c).toBeTruthy();
    expect(dockCar5('label', () => true)).toMatchObject({ area: 'artists', label: { pt: 'Artistas', en: 'Artists' } });
    expect(dockCar5('manager', () => true).area).toBe('management');
    expect(dockCar5('musician', () => true).area).toBe('cp17-musician');
  });
  it('página que não existe nesta build cai na página da carreira', () => {
    expect(dockCar5('studio', (a) => a !== 'studio12', CAREER_PAGE17.studio.area).area).toBe('cp17-studio');
    expect(dockCar5('desconhecida', () => true).area).toBe('artists');
  });
  it('teclas: ⇧1 sede, ⇧2 carreira, ⇧3 casa, ⇧4 cidade, ⇧5 mundo, ⇧6 celular, demos em ⇧9, sem conflito', () => {
    expect(['shift+1', 'shift+2', 'shift+3', 'shift+4', 'shift+5', 'shift+6'].map((c) => bindOf5(c)!.id))
      .toEqual(['travel:sede', 'sys:artists', 'travel:casa', 'travel:cidade', 'travel:mundo', 'sys:phone']);
    expect(bindOf5('shift+9')!.id).toBe('obj:demos');
    expect(conflicts5()).toEqual([]);
  });
});

describe('BUGS33 · ícone de cada carreira existe (sem cair no aviso)', () => {
  it('icons17/icons31/icons.ts têm o desenho', async () => {
    const { icon17Px } = await import('../src/ui/pixel/icons17');
    const { icon31Px } = await import('../src/ui/pixel/icons31');
    const src = (await import('node:fs')).readFileSync('src/ui/pixel/icons.ts', 'utf8');
    for (const d of Object.values(DOCK_CAR5)) {
      if (d.icon === 'artistas') continue;
      const ok = !!icon17Px(d.icon) || !!icon31Px(d.icon) || new RegExp(`['"]?${d.icon}['"]?\\s*[:(]`).test(src);
      expect(ok, d.icon).toBe(true);
    }
  });
});
