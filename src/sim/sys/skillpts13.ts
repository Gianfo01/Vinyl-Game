// Rodada 13: pontos de habilidade por conquistas. Prêmios, nº 1, hits (top 10), certificações e turnês
// esgotadas pagam pontos UMA vez cada (ids guardados em SkillState.ach), com teto vitalício por fonte
// para a árvore não virar corrida de farm. Cada pagamento vai para o diário (achLog) e para a notificação.

import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import type { GameState, Release } from '../types';
import { fmtL, notify } from '../util';
import { skills } from './persona';

export interface AchKind { id: string; name: L; desc: L; cap: number }
export const ACH_KINDS: AchKind[] = [
  { id: 'award', name: l('Prêmios', 'Awards'), desc: l('Prêmio internacional +2, nacional +1', 'International award +2, national +1'), cap: 8 },
  { id: 'n1', name: l('Nº 1 nas paradas', '#1 on the charts'), desc: l('+1 por single ou álbum nº 1', '+1 per #1 single or album'), cap: 6 },
  { id: 'hit', name: l('Hits (top 10)', 'Hits (top 10)'), desc: l('+1 por lançamento no top 10', '+1 per top-10 release'), cap: 5 },
  { id: 'cert', name: l('Certificações', 'Certifications'), desc: l('Ouro/platina +1, diamante +2', 'Gold/platinum +1, diamond +2'), cap: 6 },
  { id: 'tour', name: l('Turnês esgotadas', 'Sold-out tours'), desc: l('+1 por turnê com a maioria das datas lotadas', '+1 per tour with most dates sold out'), cap: 3 },
];
const kindById = Object.fromEntries(ACH_KINDS.map((k) => [k.id, k]));
const CERT = { gold: l('ouro', 'gold'), platinum: l('platina', 'platinum'), diamond: l('diamante', 'diamond') };

const mine = (s: GameState, rel?: Release): rel is Release => !!rel && !rel.hist && (rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand);

/** silent = marca como visto sem pagar (histórico de uma partida recém-criada). */
function pay(s: GameState, kind: string, key: string, n: number, why: L, silent: boolean): void {
  const S0 = skills(s);
  S0.ach ??= [];
  if (S0.ach.includes(key)) return;
  S0.ach.push(key);
  if (silent) return;
  const pts = (S0.achPts ??= {});
  const give = Math.min(n, Math.max(0, kindById[kind].cap - (pts[kind] ?? 0)));
  if (!give) return;
  pts[kind] = (pts[kind] ?? 0) + give;
  S0.points += give;
  S0.earned += give;
  const text = fmtL(l('+{n} ponto(s) de habilidade: {w}.', '+{n} ability point(s): {w}.'), { n: give, w: why });
  (S0.achLog ??= []).unshift({ week: s.week, text });
  if (S0.achLog.length > 40) S0.achLog.length = 40;
  notify(s, text, 'good');
}

/** Varre o estado e paga o que ainda não foi pago. */
export function awardSkillPoints(s: GameState): void {
  const S0 = skills(s);
  const silent = !S0.ach && s.week < 4;
  S0.ach ??= [];
  for (const a of s.awards) {
    if (!a.byPlayer) continue;
    pay(s, 'award', `aw:${a.year}:${a.category}:${a.releaseId ?? a.actId ?? a.name}`, a.category.startsWith('nat_') ? 1 : 2, fmtL(l('prêmio — {n}', 'award — {n}'), { n: a.name }), silent);
  }
  for (const h of s.charts.number1History) {
    const rel = s.releases[h.releaseId];
    if (mine(s, rel)) pay(s, 'n1', `n1:${rel.id}`, 1, fmtL(l('nº 1 com “{t}”', '#1 with "{t}"'), { t: rel.title }), silent);
  }
  for (const rel of Object.values(s.releases)) {
    if (!mine(s, rel)) continue;
    if (rel.peak <= 10 && rel.kind !== 'demo') pay(s, 'hit', `hit:${rel.id}`, 1, fmtL(l('hit top {p} com “{t}”', 'top-{p} hit with "{t}"'), { p: rel.peak, t: rel.title }), silent);
    if (rel.certified) pay(s, 'cert', `cert:${rel.certified}:${rel.id}`, rel.certified === 'diamond' ? 2 : 1, fmtL(l('disco de {c} para “{t}”', '{c} record for "{t}"'), { c: CERT[rel.certified], t: rel.title }), silent);
  }
  for (const t of s.tours) {
    const a = s.acts[t.actId];
    if (t.status !== 'done' || !(a?.owner === 'player' || a?.playerBand)) continue;
    const played = t.stops.filter((x) => x.status === 'played');
    if (played.length >= 3 && played.filter((x) => x.sold >= x.capacity * 0.98).length >= played.length * 0.7) pay(s, 'tour', `tour:${t.id}`, 1, fmtL(l('turnê “{n}” esgotada', 'tour "{n}" sold out'), { n: t.name }), silent);
  }
}

registerSimHook('month', 'skillpts13', (s) => awardSkillPoints(s));
