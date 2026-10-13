// Prévia de desenvolvimento (não entra no build): a sede (HqView) com todo o equipamento numa era e a
// galeria de todos os sprites de objetos. Uso: npm run dev → /tools/preview/gear.html?year=1925&view=hq|gallery
import '../../src/styles.css';
import '../../src/ui/app'; // mesma ordem de inicialização dos módulos do jogo
import { HqView } from '../../src/ui/hq';
import { createGame } from '../../src/sim/worldgen';
import { defaultConfig } from '../../src/sim/bot';
import { EQUIPMENT } from '../../src/data/rules';
import { ERAS, eraOf } from '../../src/ui/pixel/palette';
import { FURN, equipmentThumb, furniture, type FurnKind } from '../../src/ui/pixel/sprites';
import { gearReady, setGearYear } from '../../src/ui/pixel/gear21';

const q = new URLSearchParams(location.search);
const year = Number(q.get('year') ?? 1965);
const view = q.get('view') ?? 'hq';
const root = document.getElementById('root')!;

async function main(): Promise<void> {
  if (q.get('pack') !== '0') await gearReady();
  if (view === 'gallery') {
    const zoom = Number(q.get('zoom') ?? 3);
    const eras = (q.get('eras') ?? ERAS.join(',')).split(',') as typeof ERAS;
    for (const era of eras) {
      const h = document.createElement('h2');
      h.textContent = era;
      root.append(h);
      const row = document.createElement('div');
      row.className = 'gal';
      for (const kind of Object.keys(FURN) as FurnKind[]) {
        if (kind === 'bus') continue;
        const sp = furniture(kind, era, (q.get('facing') as 'SW' | 'SE') ?? 'SW', kind === 'mic' ? 1 : 0, 0);
        const c = document.createElement('canvas');
        c.width = sp.c.width * zoom;
        c.height = sp.c.height * zoom;
        c.title = kind;
        const x = c.getContext('2d')!;
        x.imageSmoothingEnabled = false;
        x.drawImage(sp.c, 0, 0, c.width, c.height);
        row.append(c);
      }
      root.append(row);
    }
    document.body.dataset.ready = '1';
    return;
  }
  setGearYear(year);
  const s = createGame(defaultConfig('preview-gear', { startYear: year }));
  if (view === 'shop') {
    // loja de equipamentos: todos os itens como se a tecnologia já existisse (só para a prévia)
    const box = document.createElement('div');
    box.style.cssText = 'background:#f6f0e6;color:#222;width:640px;padding:8px';
    const tbl = document.createElement('table');
    tbl.className = 'tbl compact';
    for (const e of EQUIPMENT) {
      const tr = tbl.insertRow();
      const c0 = tr.insertCell();
      c0.className = 'equip-thumb-cell';
      c0.append(equipmentThumb(e.id, eraOf(year)));
      tr.insertCell().textContent = e.name.pt;
    }
    box.append(tbl);
    root.append(box);
    document.body.dataset.ready = '1';
    return;
  }
  s.player.hq = Number(q.get('level') ?? 3);
  s.player.equipment = EQUIPMENT.map((e) => e.id);
  const hq = new HqView(() => s);
  const box = document.createElement('div');
  box.className = 'hq';
  box.append(hq.toolbar, hq.stage);
  root.append(box);
  hq.start();
  setTimeout(() => { document.body.dataset.ready = eraOf(s.year); }, 1200);
}
void main();
