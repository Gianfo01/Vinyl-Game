// r23: jornada do primeiro disco — o próximo passo recomendado é função pura do estado.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceWeek } from '../src/sim/tick';
import { runSimHooks } from '../src/sim/ext4';
import { composeSongs, recordSongs } from '../src/sim/production';
import { addAgendaAction, createProject, projectResult, scheduleProject, type MusicProject } from '../src/sim/sys/project8';
import { bookedAction23, bookedText23, nextStep23 } from '../src/sim/sys/journey23';
import { playerActs, rngOf } from '../src/sim/util';

function setup(seed: string) {
  const s = createGame(defaultConfig(seed, { scenario: 'emerging' }));
  const act = s.acts[playerActs(s)[0]];
  for (const id of act.songs) if (!s.songs[id].releaseId) s.songs[id].vault = true;
  // agenda manual e vazia: nada marcado no começo
  s.delegated[act.id] = false;
  s.agenda[act.id] = [];
  return { s, act, r: rngOf(s) };
}

describe('r23 nextStep23', () => {
  it('sem artista → encontrar um artista', () => {
    const { s } = setup('r23-a');
    for (const a of Object.values(s.acts)) if (a.owner === 'player') a.owner = 'npc' as typeof a.owner;
    expect(nextStep23(s)).toBe('artist');
  });

  it('atravessa repertório → trabalho marcado → gravação → capa/verba/data → divulgação', () => {
    const { s, act, r } = setup('r23-b');
    const p = createProject(s, act.id, { type: 'single', concept: 'radio' }) as MusicProject;
    expect(nextStep23(s, act.id, p)).toBe('songs');
    // compor já na agenda: não pede outro clique, diz a semana
    expect(addAgendaAction(s, p, { action: 'compose', params: { week: 2 } })).toBeNull();
    expect(nextStep23(s, act.id, p)).toBe('busy');
    const b = bookedAction23(s, act, 'compose')!;
    expect(b.week).toBe(2);
    expect(bookedText23(b).pt).toContain('semana 2');
    // música escrita → preparar gravação
    s.agenda[act.id] = [];
    composeSongs(s, r, act, 1);
    runSimHooks('week', s, r);
    expect(p.songIds.length).toBeGreaterThan(0);
    expect(nextStep23(s, act.id, p)).toBe('record');
    // gravado → revisar capa, verba e data
    recordSongs(s, r, act, p.songIds, 1, 'balanced', 'player');
    expect(nextStep23(s, act.id, p)).toBe('release');
    expect(scheduleProject(s, r, p)).toBeNull();
    expect(nextStep23(s, act.id, p)).toBe('promo');
  });

  it('sem projeto: deriva do artista e é pura (não muda o estado)', () => {
    const { s, act } = setup('r23-c');
    const before = JSON.stringify(s.agenda) + JSON.stringify(s.delegated);
    expect(nextStep23(s, act.id)).toBe('songs');
    expect(JSON.stringify(s.agenda) + JSON.stringify(s.delegated)).toBe(before);
  });

  it('meta de fãs diz a janela de medição', () => {
    const { s, act, r } = setup('r23-d');
    const p = createProject(s, act.id, { type: 'single', concept: 'debut' }) as MusicProject;
    composeSongs(s, r, act, 1);
    runSimHooks('week', s, r);
    recordSongs(s, r, act, p.songIds, 1, 'balanced', 'player');
    p.weeksAhead = 1;
    expect(scheduleProject(s, r, p)).toBeNull();
    for (let i = 0; i < 8 && !p.releaseId; i++) advanceWeek(s);
    expect(p.releaseId).toBeTruthy();
    expect(nextStep23(s, act.id, p)).toBe('debrief');
    expect(projectResult(s, p)!.goalText.pt).toContain('início do projeto');
  });
});
