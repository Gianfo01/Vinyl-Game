// Rodada 16 — cenas só em momentos: mapeamento puro evento → cena (local pelo porte/tipo/época),
// fila de momentos a partir do diário e preço de matéria-prima já na época no jogo novo.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { remember } from '../src/sim/util';
import { momentOfMemory16, mo16, tierOfCap16, type Moment16 } from '../src/sim/sys/moments16';
import { matTarget } from '../src/sim/sys/industry/supply13';
import { eraTier16, momentSpec16 } from '../src/ui/pixel/moment16';
import { sceneSpec14 } from '../src/ui/pixel/spec14';

const show = (tier: number, year: number, extra: Partial<Extract<Moment16, { k: 'show' }>> = {}): Moment16 => ({ k: 'show', year, tier, att: 100, cap: 200, ...extra });

describe('momentos r16', () => {
  it('show: o local segue o porte real da casa e a época', () => {
    expect(momentSpec16(show(0, 1990)).place).toBe('venue_bar');
    expect(momentSpec16(show(1, 1990)).place).toBe('venue_club');
    expect(momentSpec16(show(2, 1990)).place).toBe('venue_theatre');
    expect(momentSpec16(show(3, 1990)).place).toBe('venue_arena');
    expect(momentSpec16(show(3, 1968)).place).toBe('venue_gym');
    expect(momentSpec16(show(4, 1990)).place).toBe('venue_stadium');
    expect(momentSpec16(show(4, 1955)).place).not.toBe('venue_stadium');
    expect(eraTier16(4, 1940)).toBe(2);
    expect(momentSpec16(show(4, 1990, { fest: true })).place).toBe('venue_festival');
    expect(tierOfCap16(150)).toBe(0);
    expect(tierOfCap16(3000)).toBe(2);
    expect(tierOfCap16(60000)).toBe(4);
    // a cena desenha o local forçado e a lotação real (casa grande vazia continua grande)
    const sp = momentSpec16({ k: 'show', year: 1995, tier: 3, att: 1500, cap: 15000 });
    const s14 = sceneSpec14(sp.scene, sp.opts);
    expect(s14.place).toBe('venue_arena');
    expect(s14.fill).toBeCloseTo(0.12, 2);
  });

  it('mídia, prêmios, estúdio, lançamento e contrato mudam com tipo e época', () => {
    const p = (medium: 'tv' | 'radio' | 'interview' | 'magazine', year: number) => momentSpec16({ k: 'press', year, medium }).place;
    expect(p('tv', 1945)).toBe('radio_am');
    expect(p('tv', 1958)).toBe('tv_variety');
    expect(p('tv', 1990)).toBe('tv_clips');
    expect(p('radio', 1955)).toBe('radio_am');
    expect(p('radio', 1985)).toBe('radio_fm');
    expect(p('radio', 2018)).toBe('podcast');
    expect(p('interview', 1975)).toBeNull(); // coletiva de imprensa
    expect(momentSpec16({ k: 'press', year: 1975, medium: 'interview' }).scene).toBe('press');
    const aw = (award: 'major' | 'national' | 'festival' | 'contest' | 'hall', year = 1990) => momentSpec16({ k: 'award', year, award });
    expect(aw('major').place).toBe('awards');
    expect(aw('national').title.en).toMatch(/National/);
    expect(aw('major').title.en).not.toBe(aw('national').title.en);
    expect(aw('festival', 1975).place).toBe('tv_auditorium');
    expect(aw('festival', 2010).place).toBe('venue_festival');
    expect(aw('contest').place).toBe('venue_bar');
    expect(momentSpec16({ k: 'record', year: 1970 }).scene).toBe('studio_live');
    expect(momentSpec16({ k: 'release', year: 1970 }).place).toBe('factory');
    expect(momentSpec16({ k: 'release', year: 2005 }).place).toBe('store');
    const c = momentSpec16({ k: 'contract', year: 1965 });
    expect(c.place).toBe('boardroom');
    expect(sceneSpec14(c.scene, c.opts).gear.en).toMatch(/Typed/);
    expect(sceneSpec14(c.scene, c.opts).title.en).toBe('Contract signing');
  });

  it('fatos do diário viram momentos; só os do jogador entram na fila', () => {
    expect(momentOfMemory16('nat_award', 2000)).toEqual({ k: 'award', year: 2000, award: 'national' });
    expect(momentOfMemory16('signed', 2000)?.k).toBe('contract');
    expect(momentOfMemory16('lineup', 2000)).toBeNull();
    const s = createGame(defaultConfig('r16-scenes', { startYear: 1985 }));
    const a = Object.values(s.acts).find((x) => x.status !== 'retired' && x.status !== 'split' && !x.owner)!;
    const before = (s.cutscenes ?? []).filter((c) => c.kind === 'moment16').length;
    remember(s, 'signed', { pt: 'x', en: 'x' }, { actId: a.id });
    expect((s.cutscenes ?? []).filter((c) => c.kind === 'moment16').length).toBe(before); // não é do jogador
    a.owner = 'player';
    remember(s, 'signed', { pt: 'assinou', en: 'signed' }, { actId: a.id });
    const q = (s.cutscenes ?? []).filter((c) => c.kind === 'moment16');
    expect(q.length).toBe(before + 1);
    expect(mo16(s).log.some((r) => r.id === q[q.length - 1].data.rec && r.ev.k === 'contract')).toBe(true);
    // entrevistas já têm cena própria: ficam só para rever
    remember(s, 'interview', { pt: 'i', en: 'i' }, { actId: a.id });
    expect((s.cutscenes ?? []).filter((c) => c.kind === 'moment16').length).toBe(before + 1);
    expect(mo16(s).log[mo16(s).log.length - 1].ev.k).toBe('press');
  });

  it('jogo novo abre com o preço de matéria-prima da época (não ×1.00 em tudo)', () => {
    const s = createGame(defaultConfig('r16-mat', { startYear: 1985 }));
    const p = s.x4.industry.matPrice;
    expect(p.polycarbonate).toBeCloseTo(matTarget('polycarbonate', 1985), 2);
    expect(p.tape).toBeCloseTo(0.85, 2);
    expect(new Set(Object.values(p)).size).toBeGreaterThan(1);
  });
});
