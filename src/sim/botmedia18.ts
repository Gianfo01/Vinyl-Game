// Rodada 18 (media18) — o playbot usa a mídia nova: estratégia de streaming por perfil, pitch para playlists,
// rádio por formato (cauteloso vai pessoalmente; agressivo usa promotor independente na era deles), clipes para
// singles de quem já tem fama, remix para gêneros de pista e resposta a virais. Nunca compra streams falsos.

import { familyOf } from '../data/world';
import { answerMsg } from './sys/people/inbox';
import { P } from './sys/people/state';
import { media18, commissionRemix18, dirFee18, djFee18, djFit18, ensureDirs18, ensureDjs18, makeVideo18, remixOpen18, videoOpen18 } from './sys/media18';
import { FMT18, HOW18, fmtsNow18, pitchRadio18, radio18, radioWeight18, type How18 } from './sys/radio18';
import { pitchOdds18, pitchPlaylist18, setStrat18, st18 } from './sys/stream18';
import type { GameState } from './types';
import { hasTech, money, playerActs } from './util';

type Prof = 'cautious' | 'balanced' | 'aggressive';
export interface LogM18 { pitch: number; radio: number; video: number; remix: number; viral: number }
const log = (s: GameState): LogM18 => { const m = media18(s).n as unknown as Record<string, number>; return { pitch: m.bpitch ?? 0, radio: m.bradio ?? 0, video: m.bvideo ?? 0, remix: m.bremix ?? 0, viral: m.bviral ?? 0 }; };
export const botMediaLog18 = log;
const inc = (s: GameState, k: string) => { const n = media18(s).n; n[k] = (n[k] ?? 0) + 1; };

export function botMedia18(s: GameState, p: Prof): void {
  if ((globalThis as { __m18nobot?: number }).__m18nobot) return; // balanço A/B
  const cash = s.player.cash;
  const streaming = hasTech(s, 'streaming');
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    if (!act) continue;
    if (streaming) setStrat18(s, id, p === 'cautious' ? 'base' : p === 'aggressive' ? 'peak' : act.fame > 45 ? 'bal' : 'base');
    const recent = act.releases.slice(-2).map((r) => s.releases[r]).filter((r) => r && r.owner === 'player' && s.week - r.week <= 4);
    for (const rel of recent) {
      // playlists editoriais (barato)
      if (streaming && !st18(s).pitch[rel.id] && pitchOdds18(s, rel).p > 0.1 && cash > money(s, 3000)) { pitchPlaylist18(s, rel.id); inc(s, 'bpitch'); }
      // rádio: melhor formato para o gênero
      if (radioWeight18(s) >= 0.45) {
        const fam = familyOf(act.genre);
        const f = fmtsNow18(s).filter((x) => FMT18[x].fam.includes(fam)).sort((a, b) => FMT18[b].reach - FMT18[a].reach)[0];
        const how: How18 = p === 'cautious' ? 'self' : p === 'aggressive' && s.year >= 1980 && s.year < 2006 ? 'indie' : 'plug';
        if (f && !radio18(s).tried[`${rel.id}|${f}`] && cash > money(s, HOW18[how].real) * 8) { pitchRadio18(s, rel.id, f, how, p !== 'cautious'); inc(s, 'bradio'); }
      }
      // clipe: single de quem já tem fama, com caixa folgado
      if (videoOpen18(s) && rel.type === 'single' && act.fame > (p === 'aggressive' ? 15 : 30) && !media18(s).vids[rel.id]) {
        const dirs = ensureDirs18(s).filter((d) => d.style === (p === 'aggressive' ? 'auteur' : 'studio'));
        const tier = p === 'aggressive' && cash > money(s, 600000) ? 2 : cash > money(s, 200000) ? 1 : 0;
        const d = dirs[0] ?? ensureDirs18(s)[0];
        if (d && cash > dirFee18(s, d, tier) * 12) { makeVideo18(s, rel.id, { tier, dir: d.id, choreo: p === 'aggressive', censor: p !== 'aggressive' }); inc(s, 'bvideo'); }
      }
      // remix para gêneros de pista
      if (remixOpen18(s) && p !== 'cautious' && !media18(s).rmx[rel.id]) {
        const dj = ensureDjs18(s).map((d) => ({ d, f: djFit18(s, d, rel) })).filter((x) => x.f >= 1).sort((a, b) => b.d.fame - a.d.fame)[0];
        if (dj && cash > djFee18(s, dj.d) * 15) { commissionRemix18(s, rel.id, dj.d.id); inc(s, 'bremix'); }
      }
    }
  }
  // virais: responde pela caixa (impulsiona se tem caixa; senão deixa acontecer)
  for (const m of P(s).inbox) {
    if (m.ref?.k18 !== 'media18_viral' || m.resolved || !m.actions?.length) continue;
    answerMsg(s, m.id, p === 'cautious' ? 'ride' : cash > money(s, 30000) ? 'push' : 'ride');
    inc(s, 'bviral');
  }
}
