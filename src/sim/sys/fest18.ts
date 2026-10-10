// Rodada 18 (live18, feedback #9) — Festival como lugar e como reputação: a CURADORIA vira confiança (o público compra
// pelo line-up que o festival escolhe; artistas aceitam cachê menor pelo prestígio e pela descoberta), PATROCINADORES
// têm exigências concretas (exclusividade de bebida, área VIP, nada explícito à tarde, cota de descobertas, ingresso
// só no app), VIZINHOS E AUTORIDADES pesam (barulho, licença, toque de recolher), a EXPERIÊNCIA conta (acessibilidade,
// transporte, circulação) e CRESCER traz riscos novos (licença defasada, gargalos, fiéis diluídos). Tudo entra pelos
// modificadores do ciclo do fest12 (mods/notes), então aparece na nota e no "por quê" da edição.
import { clamp } from '../../core/rng';
import { cityById, familyOf, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import type { GameState } from '../types';
import { fmtL, money } from '../util';
import { festModel } from './live/festival';
import { liveOf, isMine, type OwnFestival } from './live/state';
import { IDENTS, f12, festFee18, festOf, festPay12, muOf, type SpK } from './fest12';

export interface F18 { xp: [number, number, number]; permit: number; neigh: number; cy: number; asked: number; ignored?: number; spd: Record<string, 1>; cap0: number; nh: number }
export interface Fest18 { f: Record<string, F18> }
declare module '../ext4' { interface Ext4 { fest18: Fest18 } }
registerExt4('fest18', () => ({ f: {} }));
export const fest18 = (s: GameState): Fest18 => { const x = s.x4 as unknown as { fest18?: Fest18 }; return (x.fest18 ??= { f: {} }); };
export function ff18(s: GameState, f: OwnFestival): F18 {
  const st = fest18(s);
  return (st.f[f.id] ??= { xp: [0, 0, 0], permit: Math.max(3000, festModel(s, f).capacity), neigh: 60, cy: 0, asked: 0, spd: {}, cap0: 0, nh: f12(s, f).hist.length });
}
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;

export const XP18: { name: L; desc: L }[] = [
  { name: l('Acessibilidade', 'Accessibility'), desc: l('Rampas, plataformas de visão, intérprete de sinais: conforto +4 (+8 em festival família) e reputação institucional.', 'Ramps, viewing platforms, sign interpreters: comfort +4 (+8 for family festivals) and institutional reputation.') },
  { name: l('Transporte', 'Transport'), desc: l('Ônibus fretados e acordo com o metrô: conforto +3, procura +4%, menos gente de carro irritando os vizinhos.', 'Shuttles and a transit deal: comfort +3, demand +4%, fewer cars annoying the neighbours.') },
  { name: l('Circulação', 'Circulation'), desc: l('Mais saídas, corredores e telões: segurança +5, menos risco de superlotação. Essencial para crescer.', 'More exits, aisles and screens: safety +5, lower crowding risk. Essential to grow.') },
];
export const xpCost18 = (s: GameState, f: OwnFestival, lvl: number) => Math.round(money(s, [0, 6000, 15000][lvl] ?? 15000) * (0.5 + festModel(s, f).capacity / 15000));
export function buyXp18(s: GameState, fid: string, i: number): L | null {
  const f = festOf(s, fid);
  if (!f) return l('Festival inválido.', 'Invalid festival.');
  const F = ff18(s, f), lvl = F.xp[i] + 1;
  if (lvl > 2) return l('Já no máximo.', 'Already maxed.');
  const c = xpCost18(s, f, lvl);
  festPay12(s, f, -c, `x18:${i}:${lvl}`, `${f.name}: ${XP18[i].name.pt} nível ${lvl}`);
  F.xp[i] = lvl;
  return null;
}

/** Reputação de curadoria: o quanto o público confia no line-up (reputação × notas recentes × edições). */
export function curation18(s: GameState, f: OwnFestival): number {
  const h = f12(s, f).hist.slice(-3);
  const avg = h.length ? h.reduce((t, x) => t + x.rating, 0) / h.length : 50;
  return Math.round(clamp(f.rep * 0.6 + avg * 0.3 + Math.min(10, h.length * 3), 0, 100));
}
festFee18.f = (s, f, a, why) => {
  if (isMine(s, a.id) || a.fame >= 70) return 1;
  const cur = curation18(s, f);
  const id = f12(s, f).ident;
  const d = clamp((cur - 40) / 250, 0, 0.2) * (id === 'discovery' || id === 'genre' ? 1 : 0.5) * (a.fame < 35 ? 1.2 : 1);
  if (d < 0.01) return 1;
  why.push(fmtL(l('Prestígio da curadoria ({c}): aceita {p}% a menos pela vitrine.', 'Curation prestige ({c}): accepts {p}% less for the showcase.'), { c: cur, p: Math.round(d * 100) }));
  return 1 - d;
};

/** Dependência do headliner: quanto da procura vem do maior nome. */
export function headDep18(s: GameState, f: OwnFestival): { share: number; name: string } {
  const city = cityById[f.cityId];
  let tot = 0, top = 0, name = '—';
  for (const x of f.lineup) {
    const a = s.acts[x.actId];
    if (!a) continue;
    const d = (a.fans.core * 0.6 + a.fans.active * 0.25 + a.fans.casual * 0.02) * (1 + a.fame / 80) * (cityById[a.city]?.market === city?.market ? 1 : 0.35);
    tot += d;
    if (d > top) { top = d; name = a.name; }
  }
  const k = IDENTS[f12(s, f).ident].loyalF;
  return { share: tot ? top / tot / Math.max(0.6, k) : 0, name };
}

const SPD: Record<SpK, { ask: L; fx: L }> = {
  beer: { ask: l('exclusividade de bebida no terreno (uma marca só, preço do bar sobe)', 'exclusive pouring rights (one brand only, bar prices up)'), fx: l('conforto −3', 'comfort −3') },
  bank: { ask: l('área VIP para clientes do banco perto do palco', 'a VIP area for bank clients near the stage'), fx: l('conforto −2, reputação comercial +1', 'comfort −2, commercial reputation +1') },
  kids: { ask: l('nada de letra explícita até o pôr do sol', 'no explicit lyrics before sunset'), fx: l('empolgação −2 se houver rock/rap no line-up', 'excitement −2 if rock/rap is on the bill') },
  luxury: { ask: l('a marca no nome do palco principal', 'the brand on the main stage\'s name'), fx: l('fiéis −4% (fora do premium)', 'loyalists −4% (outside premium)') },
  indie: { ask: l('pelo menos 3 descobertas (fama < 35) no line-up', 'at least 3 discoveries (fame < 35) on the bill'), fx: l('se não cumprir: −30% da 2ª parcela', 'if unmet: −30% of the 2nd instalment') },
  tech: { ask: l('ingresso só pelo aplicativo (com coleta de dados)', 'app-only tickets (with data collection)'), fx: l('procura −3%; depois de 2018, reputação institucional −1', 'demand −3%; after 2018, institutional reputation −1') },
};

registerInboxKind('fest18', {
  label: l('Festival', 'Festival'), cat: 'decision', icon: 'flag', prio: 2,
  goto: () => ({ area: 'shows', label: l('Abrir festival', 'Open festival') }),
  handle: (s, m, action) => {
    const f = festOf(s, String(m.ref?.fid));
    if (!f) return l('Festival não existe mais.', 'The festival no longer exists.');
    const x = f12(s, f), F = ff18(s, f), md = x.cyc.mods, cap = festModel(s, f).capacity;
    if (m.ref?.t === 'nb') {
      if (action === 'permit') { const c = Math.round(money(s, 0.4) * cap); festPay12(s, f, -c, `x18:permit:${x.cyc.year}`, `${f.name}: licença ampliada e isolamento acústico`); F.permit = Math.round(cap * 1.2); F.neigh = clamp(F.neigh + 15, 0, 100); return fmtL(l('Licença ampliada ({c}). Vizinhos e prefeitura satisfeitos.', 'Permit expanded ({c}). Neighbours and city hall satisfied.'), { c: usd(c) }); }
      if (action === 'curfew') { md.ex -= 5; F.permit = Math.max(F.permit, cap); F.neigh = clamp(F.neigh + 10, 0, 100); x.cyc.notes.push(l('Toque de recolher às 23h: a noite acaba mais cedo (empolgação −5), mas a licença saiu.', '11pm curfew: the night ends earlier (excitement −5), but the permit came through.')); return l('Toque de recolher aceito.', 'Curfew accepted.'); }
      md.risk += 0.04; md.dem *= 0.9; F.ignored = x.cyc.year; F.neigh = clamp(F.neigh - 15, 0, 100);
      x.cyc.notes.push(l('Sem licença à altura: a polícia limitou a entrada (procura −10%) e há risco de multa.', 'No adequate permit: police capped the gates (demand −10%) and a fine looms.'));
      return l('Você ignorou vizinhos e prefeitura.', 'You ignored the neighbours and city hall.');
    }
    if (m.ref?.t === 'sp') {
      const k = String(m.ref.k) as SpK, sid = String(m.ref.sid);
      if (action === 'refuse') { const cm = x.commits.find((c) => !c.done && c.kind === 'sponsor' && c.what.pt.startsWith(String(m.ref?.name))); if (cm) cm.amt = Math.round(cm.amt * 0.75); return l('Recusado: o patrocinador corta 25% da 2ª parcela.', 'Refused: the sponsor cuts 25% of the 2nd instalment.'); }
      applySp(s, f, k, sid);
      return l('Exigência aceita.', 'Demand accepted.');
    }
    return l('Sem efeito.', 'No effect.');
  },
});
function applySp(s: GameState, f: OwnFestival, k: SpK, sid: string): void {
  const x = f12(s, f), md = x.cyc.mods;
  const acts = f.lineup.map((y) => s.acts[y.actId]).filter(Boolean);
  if (k === 'beer') md.co -= 3;
  if (k === 'bank') { md.co -= 2; s.player.reputation.commercial = clamp(s.player.reputation.commercial + 1, 0, 100); }
  if (k === 'kids' && acts.some((a) => ['rock', 'hiphop'].includes(familyOf(a.genre)))) md.ex -= 2;
  if (k === 'luxury' && x.ident !== 'premium') md.loyal *= 0.96;
  if (k === 'tech') { md.dem *= 0.97; if (s.year >= 2018) s.player.reputation.institutional = clamp(s.player.reputation.institutional - 1, 0, 100); }
  if (k === 'indie') ff18(s, f).spd[`indie:${sid}`] = 1;
  x.cyc.notes.push(fmtL(l('Exigência de patrocinador: {a} ({x}).', 'Sponsor demand: {a} ({x}).'), { a: SPD[k].ask, x: SPD[k].fx }));
}

registerSimHook('month', 'fest18', (s) => {
  for (const f of liveOf(s).fests) {
    const x = f12(s, f), F = ff18(s, f), md = x.cyc.mods;
    const m = festModel(s, f), cap = m.capacity;
    // novo ciclo: experiência e riscos de crescimento entram nos modificadores
    if (F.cy !== x.cyc.year) {
      F.cy = x.cyc.year;
      const fam = x.ident === 'family' ? 2 : 1;
      md.co += 4 * F.xp[0] * fam + 3 * F.xp[1];
      md.dem *= 1 + 0.04 * F.xp[1];
      md.sa += 5 * F.xp[2];
      md.risk = Math.max(0, md.risk - 0.03 * F.xp[2]);
      if (F.xp.some((v) => v)) x.cyc.notes.push(fmtL(l('Experiência: acessibilidade {a}, transporte {t}, circulação {c} (conforto/segurança somados).', 'Experience: accessibility {a}, transport {t}, circulation {c} (comfort/safety added).'), { a: F.xp[0], t: F.xp[1], c: F.xp[2] }));
      if (F.cap0 && cap > F.cap0 * 1.3) {
        if (F.xp[2] < 1) { md.risk += 0.05; md.sa -= 4; }
        md.loyal *= 0.95; F.neigh = clamp(F.neigh - 10, 0, 100);
        x.cyc.notes.push(fmtL(l('Cresceu {p}%: mais gente que não conhece o festival (fiéis diluídos), vizinhos mais incomodados{c}.', 'Grew {p}%: more people who don\'t know the festival (loyalists diluted), more annoyed neighbours{c}.'), { p: Math.round((cap / F.cap0 - 1) * 100), c: F.xp[2] < 1 ? l(' e circulação no limite (risco maior)', ' and circulation at its limit (higher risk)') : '' }));
      }
      F.cap0 = cap;
      if (F.xp[0] + F.xp[1] + F.xp[2]) festPay12(s, f, -money(s, 800) * (F.xp[0] + F.xp[1] + F.xp[2]), `x18:upkeep:${x.cyc.year}`, `${f.name}: manutenção da experiência`);
    }
    // vizinhos e licença: uma decisão por ciclo, 2–4 meses antes
    const mu = muOf(s, f);
    if (mu >= 2 && mu <= 4 && F.asked !== x.cyc.year && (cap > F.permit || F.neigh < 45)) {
      F.asked = x.cyc.year;
      const c = Math.round(money(s, 0.4) * cap);
      pushInbox18(s, 'fest18', {
        from: l('Prefeitura e associação de moradores', 'City hall and residents\' association').pt, tone: 'bad',
        subject: fmtL(l('{f}: barulho, trânsito e licença', '{f}: noise, traffic and permits'), { f: f.name }),
        body: fmtL(l('Capacidade {c} contra licença para {p}; boa vontade dos vizinhos {n}/100. Moradores reclamam de som até tarde e carros nas calçadas.', 'Capacity {c} against a permit for {p}; neighbour goodwill {n}/100. Residents complain about late sound and cars on sidewalks.'), { c: cap, p: F.permit, n: F.neigh }),
        ref: { fid: f.id, t: 'nb' },
        actions: [
          { id: 'permit', label: fmtL(l('Ampliar licença + isolamento ({c})', 'Expand permit + soundproofing ({c})'), { c: usd(c) }) },
          { id: 'curfew', label: l('Aceitar toque de recolher às 23h (empolgação −5)', 'Accept an 11pm curfew (excitement −5)') },
          { id: 'ignore', label: l('Ignorar (procura −10%, risco e multa)', 'Ignore (demand −10%, risk and fine)') },
        ],
      });
    }
    // exigências dos patrocinadores fechados
    for (const sp of x.cyc.sponsors) {
      const key = `${x.cyc.year}:${sp.id}`;
      if (F.spd[key]) continue;
      F.spd[key] = 1;
      pushInbox18(s, 'fest18', {
        from: sp.name, subject: fmtL(l('{n} quer {a}', '{n} wants {a}'), { n: sp.name, a: SPD[sp.k].ask }),
        body: fmtL(l('Contrapartida do patrocínio: {a}. Efeito: {x}.', 'Sponsorship condition: {a}. Effect: {x}.'), { a: SPD[sp.k].ask, x: SPD[sp.k].fx }),
        ref: { fid: f.id, t: 'sp', k: sp.k, sid: sp.id, name: sp.name },
        actions: [{ id: 'refuse', label: l('Recusar (−25% da 2ª parcela)', 'Refuse (−25% of the 2nd instalment)') }, { id: 'accept', label: l('Aceitar', 'Accept') }],
      });
    }
    // depois da edição: vizinhos, multa, cota de descobertas
    const hl = x.hist.length;
    if (hl > F.nh) {
      F.nh = hl;
      const h = x.hist[hl - 1];
      if (F.ignored === h.y) {
        const fine = money(s, 3000) + Math.round(h.crowd * money(s, 0.3));
        festPay12(s, f, -fine, `x18:fine:${h.y}`, `${f.name}: multa por funcionar acima da licença`);
        emitFact(s, { kind: 'law', actors: ['player'], place: f.cityId, severity: 25, text: fmtL(l('{f} multado em {c}: público acima da licença e barulho fora de hora.', '{f} fined {c}: crowd above the permit and late noise.'), { f: f.name, c: usd(fine) }), tags: ['festival', 'permit'], src: 'fest18' });
      }
      F.neigh = clamp(F.neigh + (h.rating >= 60 ? 3 : -3) + F.xp[1] * 2, 0, 100);
    }
  }
});
// cota de descobertas do instituto cultural: confere no mês do festival, antes da 2ª parcela vencer
registerSimHook('month', 'fest18:indie', (s) => {
  for (const f of liveOf(s).fests) {
    const x = f12(s, f), F = ff18(s, f);
    if (muOf(s, f) !== 0) continue;
    for (const sp of x.cyc.sponsors) {
      if (!F.spd[`indie:${sp.id}`]) continue;
      delete F.spd[`indie:${sp.id}`];
      const n = f.lineup.filter((y) => (s.acts[y.actId]?.fame ?? 99) < 35).length;
      if (n >= 3) continue;
      const cm = x.commits.find((c) => !c.done && c.kind === 'sponsor' && c.what.pt.startsWith(sp.name));
      if (cm) cm.amt = Math.round(cm.amt * 0.7);
      x.cyc.notes.push(fmtL(l('{n}: só {k} descobertas no line-up — cortou 30% da 2ª parcela.', '{n}: only {k} discoveries on the bill — cut 30% of the 2nd instalment.'), { n: sp.name, k: n }));
    }
  }
});

registerAdvisorTip('fest18', (s) => {
  const out = [];
  for (const f of liveOf(s).fests) {
    if (!f.lineup.length) continue;
    const d = headDep18(s, f);
    if (d.share >= 0.55 && f12(s, f).ident !== 'discovery') out.push({ id: `fest18-head-${f.id}`, level: 'warn' as const, cat: 'opportunity' as const, score: 40, text: fmtL(l('{f} depende demais de {a}.', '{f} depends too much on {a}.'), { f: f.name, a: d.name }), why: [fmtL(l('~{p}% da procura vem do maior nome: se cancelar, o festival afunda.', '~{p}% of demand comes from the top name: if they cancel, the festival sinks.'), { p: Math.round(d.share * 100) })], effect: l('Mais nomes médios ou uma curadoria que o público confie.', 'More mid-size names or a curation people trust.'), goto: { area: 'shows' } });
  }
  return out;
});
