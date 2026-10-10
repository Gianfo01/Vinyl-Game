// Rodada 14 — notoriedade por carreira (0–100). Sobe com conquistas da carreira (sucessos e prêmios do selo,
// clientes bem-sucedidos, edições de festival lotadas, créditos de estúdio, catálogo, fama da banda...),
// decai devagar e tem degraus (desconhecido → conhecido local → nacional → internacional → lenda) com efeitos reais:
// ofertas melhores, bônus de carreira, artistas que procuram o empresário e imprensa. Sempre explica o motivo.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { registerPerkSource, type PerkValues } from '../perks';
import type { GameState } from '../types';
import { fmtL, money, notify } from '../util';
import { careers } from './careers12';
import { liveOf } from './live';
import { mgCap, ventures } from './ventures9';

export const TIERS: { min: number; name: L; desc: L }[] = [
  { min: 0, name: l('Desconhecido', 'Unknown'), desc: l('Ninguém ainda sabe quem você é neste ofício.', 'Nobody knows who you are in this trade yet.') },
  { min: 15, name: l('Conhecido local', 'Local name'), desc: l('A cena da sua cidade já conhece seu trabalho.', 'Your home scene knows your work.') },
  { min: 35, name: l('Nacional', 'National'), desc: l('Imprensa e profissionais do país falam de você.', 'Press and professionals across the country talk about you.') },
  { min: 60, name: l('Internacional', 'International'), desc: l('Seu nome abre portas fora do país.', 'Your name opens doors abroad.') },
  { min: 85, name: l('Lenda', 'Legend'), desc: l('Referência do ofício: todos querem trabalhar com você.', 'A reference in the trade: everyone wants to work with you.') },
];
export const tierOf = (v: number) => TIERS.reduce((t, x, i) => (v >= x.min ? i : t), 0);

const SHOW: PerkValues = { showRevenue: 0.02 };
/** Efeito por degrau de cada carreira (perks reais + texto mostrado na interface). */
const FX: Record<string, { per: PerkValues; txt: L }> = {
  label: { per: { offer: 0.02 }, txt: l('+0,02 por degrau no score das suas ofertas a artistas e +1 sinal de talento por mês a partir de Nacional', '+0.02 per tier on your offers to acts, and +1 talent signal a month from National') },
  manager: { per: { trust: 1 }, txt: l('+1 de confiança inicial por degrau; artistas sem empresário podem procurar você', '+1 starting trust per tier; unmanaged acts may approach you') },
  festival: { per: SHOW, txt: l('+2% de renda de shows por degrau (cabeças de cartaz topam cachês melhores)', '+2% show revenue per tier (headliners accept better fees)') },
  booking: { per: SHOW, txt: l('+2% de renda de shows por degrau (casas maiores abrem a agenda)', '+2% show revenue per tier (bigger rooms open their calendars)') },
  venue: { per: SHOW, txt: l('+2% de renda de shows por degrau (artistas maiores querem tocar na sua casa)', '+2% show revenue per tier (bigger acts want to play your room)') },
  studio: { per: { songQ: 0.15 }, txt: l('+0,15 de qualidade nas gravações por degrau (produtores e artistas pedem horas)', '+0.15 recording quality per tier (producers and acts ask for time)') },
  publisher: { per: { valuation: 0.02 }, txt: l('+2% de valor do catálogo por degrau (sincronias mais caras)', '+2% catalog value per tier (pricier sync deals)') },
  media: { per: { critics: 0.05 }, txt: l('+0,05 na nota da crítica por degrau (seu veículo dita o gosto)', '+0.05 critic score per tier (your outlet sets the taste)') },
  platform: { per: { valuation: 0.02 }, txt: l('+2% de valor da empresa por degrau', '+2% company value per tier') },
  musician: { per: { appeal: 0.02 }, txt: l('+2% de apelo dos lançamentos por degrau (fãs novos descobrem a banda)', '+2% release appeal per tier (new fans discover the band)') },
};
export const fxText = (id: string): L => FX[id]?.txt ?? l('', '');
export const PRESS_TXT = l('A partir de Nacional, a imprensa pode citar você (+0,5 de reputação institucional).', 'From National, the press may cite you (+0.5 institutional reputation).');

export interface NotoState { v: Record<string, number>; snap: Record<string, number>; log: { y: number; m: number; c: string; d: number; t: L }[]; peak: Record<string, number> }
declare module '../ext4' { interface Ext4 { noto14: NotoState } }
registerExt4('noto14', (): NotoState => ({ v: {}, snap: {}, log: [], peak: {} }));
export const noto = (s: GameState): NotoState => (s.x4 as unknown as { noto14: NotoState }).noto14;

const owned = (s: GameState, k: string) => ventures(s).list.filter((v) => v.kind === k);
/** Contadores acumulados por carreira + o que cada ponto significa (para o "porquê"). */
const METRIC: Record<string, { fn: (s: GameState) => number; why: L }> = {
  label: { fn: (s) => { const t = s.player.stats; return t.top10s * 3 + t.number1s * 5 + t.gold * 1.5 + t.platinum * 3 + t.awards * 6; }, why: l('sucessos, discos de ouro/platina e prêmios do selo', 'hits, gold/platinum records and label awards') },
  manager: { fn: (s) => ventures(s).mg.total / Math.max(1, money(s, 5000)) + ventures(s).mg.clients.length * 1.5, why: l('ganhos e carteira dos seus clientes', 'your clients\' earnings and roster') },
  festival: { fn: (s) => owned(s, 'festival').reduce((t, v) => t + (v.editions ?? []).reduce((u, e) => u + (e.verdict === 'legend' ? 10 : e.verdict === 'ok' ? 3 : e.verdict === 'flop' ? -2 : -7), 0), 0), why: l('edições do festival (lenda, lotada, fracasso ou desastre)', 'festival editions (legend, sold out, flop or disaster)') },
  booking: { fn: (s) => owned(s, 'booking').reduce((t, v) => t + v.total / Math.max(1, money(s, 8000)) + (v.clients?.length ?? 0), 0), why: l('comissões e agenciados da agência', 'agency commissions and roster') },
  venue: { fn: (s) => { const v = liveOf(s).venue; return v ? v.rentalNights * 0.15 + v.acoustics * 0.02 : 0; }, why: l('noites de casa cheia e acústica', 'full-house nights and acoustics') },
  studio: { fn: (s) => owned(s, 'studio').reduce((t, v) => t + (v.booked ?? []).reduce((u, b) => u + b.n * 0.4, 0) + (v.sound ?? 0) * 0.05, 0), why: l('créditos de sessões e som da casa', 'session credits and house sound') },
  publisher: { fn: (s) => owned(s, 'publisher').reduce((t, v) => t + (v.cat?.length ?? 0) * 1.2, 0), why: l('músicas colocadas no catálogo', 'songs placed in the catalog') },
  media: { fn: (s) => owned(s, 'media').reduce((t, v) => t + v.rep * 0.1, 0), why: l('reputação dos seus veículos', 'your outlets\' reputation') },
  platform: { fn: (s) => owned(s, 'platform').reduce((t, v) => t + Math.log10(1 + (v.subs ?? 0)) * 3, 0), why: l('assinantes da plataforma', 'platform subscribers') },
  musician: { fn: (s) => { const b = Object.values(s.acts).find((a) => a.playerBand); return b ? b.fame * 0.25 + (b.fans?.core ?? 0) / 4000 : 0; }, why: l('fama e fãs da sua banda', 'your band\'s fame and fans') },
};

const NAMES: Record<string, L> = { label: l('Gravadora', 'Label'), manager: l('Empresário', 'Manager'), festival: l('Festival', 'Festival'), booking: l('Agência', 'Agency'), venue: l('Casa de shows', 'Venue'), studio: l('Estúdio', 'Studio'), publisher: l('Editora', 'Publisher'), media: l('Mídia', 'Media'), platform: l('Plataforma', 'Platform'), musician: l('Músico', 'Musician') };
export const careerLabel = (id: string): L => NAMES[id] ?? l(id, id);

const push = (s: GameState, c: string, d: number, t: L) => { const st = noto(s); st.log.push({ y: s.year, m: s.month, c, d: Math.round(d * 10) / 10, t }); if (st.log.length > 40) st.log.shift(); };

export const notoriety = (s: GameState, id: string): number => Math.round((noto(s).v[id] ?? 0) * 10) / 10;
export const notoTier = (s: GameState, id: string) => tierOf(noto(s).v[id] ?? 0);

export function notoMonth(s: GameState): void {
  const st = noto(s);
  const act = careers(s).active;
  for (const id of Object.keys(METRIC)) {
    const cur = METRIC[id].fn(s);
    const last = st.snap[id];
    st.snap[id] = cur;
    if (!act.includes(id)) continue;
    const v0 = st.v[id] ?? 0;
    const gain = last === undefined ? 0 : clamp(cur - last, -4, 8);
    const v = clamp(v0 * 0.992 - 0.04 + gain, 0, 100);
    st.v[id] = v;
    const c = careerLabel(id);
    if (Math.abs(gain) >= 0.5) push(s, id, gain, fmtL(gain > 0 ? l('{c}: notoriedade sobe por {w}.', '{c}: notoriety rises from {w}.') : l('{c}: notoriedade cai por {w}.', '{c}: notoriety falls from {w}.'), { c, w: METRIC[id].why }));
    const a = tierOf(v0), b = tierOf(v);
    if (b > a) { push(s, id, 0, fmtL(l('{c}: você agora é {t}.', '{c}: you are now {t}.'), { c, t: TIERS[b].name })); notify(s, fmtL(l('Notoriedade como {c}: {t}. {d}', 'Notoriety as {c}: {t}. {d}'), { c, t: TIERS[b].name, d: TIERS[b].desc }), 'good'); }
    else if (b < a) { push(s, id, 0, fmtL(l('{c}: o nome esfria, volta a {t}.', '{c}: the name cools off, back to {t}.'), { c, t: TIERS[b].name })); notify(s, fmtL(l('Notoriedade como {c} cai para {t}.', 'Notoriety as {c} drops to {t}.'), { c, t: TIERS[b].name }), 'bad'); }
    st.peak[id] = Math.max(st.peak[id] ?? 0, v);
  }
  // efeitos ativos: clientes procuram o empresário; imprensa fala do mais notório
  const r = Rng.fromSeed(`${s.config.seed}:noto14:${s.year}:${s.month}`);
  const mgT = act.includes('manager') ? notoTier(s, 'manager') : 0;
  const mg = ventures(s).mg;
  if (mgT >= 1 && mg.clients.length < mgCap(s) && r.chance(0.05 * mgT)) {
    const taken = new Set(mg.clients.map((c) => c.actId));
    const pool = Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && !a.playerBand && !taken.has(a.id) && a.fame >= 4 && a.fame <= 25 + mgT * 12).sort((a, b) => b.momentum - a.momentum).slice(0, 6);
    if (pool.length) {
      const a = r.pick(pool);
      mg.clients.push({ actId: a.id, rate: 0.12, since: s.week, sat: 62, earned: 0 });
      const t = fmtL(l('{a} procura você por conta do seu nome (notoriedade como empresário) e assina por 12%.', '{a} approaches you because of your name (manager notoriety) and signs at 12%.'), { a: a.name });
      push(s, 'manager', 0, t); notify(s, t, 'good');
    }
  }
  const top = act.reduce((m, id) => ((st.v[id] ?? 0) > (st.v[m] ?? 0) ? id : m), act[0]);
  if (top && notoTier(s, top) >= 2 && r.chance(0.08 * (notoTier(s, top) - 1))) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional + 0.5, 0, 100);
    const t = fmtL(l('A imprensa cita você como referência em {c} (+0,5 de reputação institucional).', 'The press cites you as a reference in {c} (+0.5 institutional reputation).'), { c: careerLabel(top) });
    push(s, top, 0, t); notify(s, t, 'info');
  }
}
registerSimHook('month', 'noto14', (s) => notoMonth(s));

registerPerkSource('noto14', (s) => {
  const out: { label: L; values: PerkValues }[] = [];
  const st = noto(s);
  for (const id of careers(s).active) {
    const t = tierOf(st.v[id] ?? 0);
    const fx = FX[id];
    if (!fx || !t) continue;
    const values: PerkValues = Object.fromEntries(Object.entries(fx.per).map(([k, v]) => [k, (v ?? 0) * t]));
    if (id === 'label' && t >= 2) values.signals = 1;
    out.push({ label: fmtL(l('Notoriedade: {c} ({t})', 'Notoriety: {c} ({t})'), { c: careerLabel(id), t: TIERS[t].name }), values });
  }
  return out;
});
/** Rodada 18: carreiras novas registram sua métrica de notoriedade (trilhas, jornalismo…). */
export function registerNoto14(id: string, fn: (s: GameState) => number, why: L, name: L): void { METRIC[id] = { fn, why }; NAMES[id] = name; }
