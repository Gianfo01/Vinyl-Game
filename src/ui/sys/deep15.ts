// Rodada 15 — aprofundamentos (interface): Sync por briefing (Catálogo), Disputas de contrato
// (Negócios), Fandom do ato (página do ato) e Júri/esnobadas (Paradas). Cada escolha mostra o porquê.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { resolveDecision } from '../../sim/events';
import { fandomOf, ritualFor } from '../../sim/fandom';
import { aw15 } from '../../sim/sys/awards15';
import { cleanBooks, courtOdds, dp15, legal15 } from '../../sim/sys/dispute15';
import { fn15, vaultSong } from '../../sim/sys/fan15';
import { MEDIA15, MOOD15, candidates, feeOf, objects, openBriefs, pitch15, sy15, type Brief15 } from '../../sim/sys/sync15';
import type { GameState } from '../../sim/types';
import { $, actLink, N, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerPageTab, registerSection, registerTab } from '../registry';
import { countryName } from '../../data/geo';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const sg = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}`;
const ym = (y: number, m: number) => `${m + 1}/${y}`;
const logList = (rows: [number, number, L][]) => rows.length ? h('ul', { class: 'small' }, rows.slice(0, 10).map(([y, m, x]) => h('li', null, `${ym(y, m)} — ${t(x)}`))) : h('p', { class: 'muted small' }, '—');

/** Cartões de decisão pendentes de um prefixo (mesmas opções da Mesa). */
function pending(s: GameState, pre: string, act?: string): HTMLElement | null {
  const ds = s.decisions.filter((d) => d.eventId.startsWith(pre) && (!act || d.ctx.act === act));
  if (!ds.length) return null;
  return h('div', null, ds.map((d) => h('div', { class: 'card' },
    h('b', null, t(d.title)), h('p', { class: 'small' }, t(d.text)),
    h('div', { class: 'row wrap' }, d.options.map((o) => h('button', { class: 'btn small', title: o.hint ? t(o.hint) : '', onclick: () => { resolveDecision(s, d.id, o.id); rerender(); } }, t(o.label)))),
    h('ul', { class: 'small muted' }, d.options.filter((o) => o.hint).map((o) => h('li', null, h('b', null, t(o.label)), ': ', t(o.hint!)))))));
}

// ---------------------------------------------------------------- sync

const pick: Record<string, string> = {};
function briefCard(s: GameState, b: Brief15): HTMLElement {
  const M = MEDIA15[b.medium];
  const cs = candidates(s, b);
  const cur = cs.find((c) => c.song.id === pick[b.id]) ?? cs[0];
  const rival = s.labels[b.rival]?.name;
  return h('div', { class: 'card' },
    h('div', { class: 'row wrap' }, h('b', null, `${b.client} — ${t(M.name)}`), ' ', pill(t(MOOD15[b.mood]), 'trait'), ' ', b.old ? pill(t(l('quer nostalgia', 'wants nostalgia')), '') : pill(t(l('quer som atual', 'wants a current sound')), ''),
      h('span', { class: 'small muted' }, ` · ${t(l('verba', 'budget'))} ~${$(feeOf(s, b, 0.5))} · ${t(l('fecha na semana {w}', 'closes week {w}'), { w: b.until })}`)),
    rival ? h('p', { class: 'small muted' }, t(l('{r} também está oferecendo uma faixa: o cliente escolhe o melhor encaixe (a deles gira em torno de {v}).', '{r} is pitching a track too: the client picks the best fit (theirs is around {v}).'), { r: rival, v: pct(Math.round(b.rv * 10) / 10) })) : null,
    !cs.length ? h('p', { class: 'muted small' }, t(l('Nenhuma faixa lançada com direitos de sync disponíveis.', 'No released track with sync rights available.'))) : h('div', null,
      select(cur.song.id, cs.map((c) => ({ value: c.song.id, label: `${c.song.title} — ${s.acts[c.song.actId]?.name ?? ''} · ${t(l('encaixe', 'fit'))} ${pct(c.fit.v)} · ${t(l('sua parte', 'your share'))} ${pct(c.share)}` })), (v) => { pick[b.id] = v; rerender(); }),
      h('ul', { class: 'small' }, cur.fit.why.map(([w, v]) => h('li', null, `${t(w)}: ${sg(v)}`))),
      h('p', { class: 'small' }, t(l('Se fechar: {f} brutos, {p} para você. ', 'If it closes: {f} gross, {p} to you. '), { f: $(feeOf(s, b, cur.fit.v)), p: $(Math.round(feeOf(s, b, cur.fit.v) * cur.share)) }), t(l('Faixa com 3+ anos pode voltar às paradas; {m} tem impulso ×{k}.', 'A track 3+ years old can return to the charts; a {m} has ×{k} pull.'), { m: M.name, k: M.boost })),
      objects(s, cur.song, b) ? h('p', { class: 'small bad' }, t(l('Atenção: é publicidade e o artista pode se opor (purista ou controle criativo com pouca confiança). Consultar antes evita a revolta, mas ele pode vetar.', 'Careful: this is advertising and the act may object (purist, or creative control with low trust). Asking first avoids a backlash, but they may veto.'))) : null,
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn small primary', onclick: () => { const r = pitch15(s, b.id, cur.song.id); toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); } }, t(l('Oferecer', 'Pitch'))),
        objects(s, cur.song, b) ? h('button', { class: 'btn small', onclick: () => { const r = pitch15(s, b.id, cur.song.id, true); toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); } }, t(l('Consultar o artista e oferecer', 'Ask the act, then pitch'))) : null)));
}

function syncTab(s: GameState): HTMLElement {
  const bs = openBriefs(s);
  const media = (Object.keys(MEDIA15) as (keyof typeof MEDIA15)[]).filter((k) => s.year >= MEDIA15[k].from && s.year <= MEDIA15[k].to).map((k) => t(MEDIA15[k].name)).join(', ');
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('Supervisores musicais mandam briefings: um clima, um meio e se querem nostalgia. Você escolhe qual faixa oferecer — o encaixe pesa clima (pelo som e tema), qualidade, idade da faixa, fama e desgaste. Meios desta época: {m}.', 'Music supervisors send briefs: a mood, a medium and whether they want nostalgia. You choose which track to pitch — fit weighs mood (from sound and theme), quality, track age, fame and overexposure. Media in this era: {m}.'), { m: media })),
    bs.length ? h('div', null, bs.map((b) => briefCard(s, b))) : h('p', { class: 'muted' }, t(l('Nenhum briefing aberto. Catálogo maior, reputação comercial e um agente de sync trazem mais pedidos.', 'No open briefs. A bigger catalog, commercial reputation and a sync agent bring more requests.'))),
    section(t(l('Resultados', 'Results')), logList(sy15(s).log)));
}
registerTab('catalogHub', { id: 'sync15', label: l('Sync', 'Sync'), icon: 'film', order: 53, render: syncTab, badge: (s) => openBriefs(s).length || undefined });

// ---------------------------------------------------------------- disputas

function disputeTab(s: GameState): HTMLElement {
  const st = dp15(s);
  const cb = cleanBooks(s);
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('Artistas com confiança baixa (ou com empresário tubarão) brigam: auditoria de royalties, greve de estúdio ou ataque na imprensa. Confiança alta previne quase tudo.', 'Acts with low trust (or a shark manager) fight back: royalty audits, studio strikes or press attacks. High trust prevents almost all of it.'))),
    pending(s, 'dsp15_'),
    section(t(l('Suas chances hoje', 'Your odds today')), h('ul', { class: 'small' },
      h('li', null, t(l('Livros limpos numa auditoria: {p}', 'Clean books in an audit: {p}'), { p: pct(cb.p) }), cb.why.length ? ` (${cb.why.map((x) => t(x)).join('; ')})` : ''),
      h('li', null, t(l('Vitória no tribunal: {p} (jurídico {j}, histórico {w}V/{d}D)', 'Winning in court: {p} (legal {j}, record {w}W/{d}L)'), { p: pct(courtOdds(s)), j: pct(legal15(s)), w: st.won, d: st.lost })),
      h('li', null, t(l('Acordos feitos: {n}', 'Settlements: {n}'), { n: st.settled })))),
    section(t(l('Casos', 'Cases')), st.cases.length ? h('ul', { class: 'small' }, st.cases.map((c) => h('li', null, `${ym(c.y, c.m)} — `, actLink(s, c.act), ` · ${t(c.t)}`))) : h('p', { class: 'muted small' }, '—')),
    section(t(l('Quem está perto do limite', 'Who is close to the edge')), h('ul', { class: 'small' }, Object.values(s.acts).filter((a) => a.owner === 'player' && !a.playerBand && a.trust < 40).map((a) => h('li', null, actLink(s, a.id), ` · ${t(l('confiança', 'trust'))} ${Math.round(a.trust)}`)))));
}
registerTab('business', { id: 'dispute15', label: l('Disputas', 'Disputes'), icon: 'gavel', order: 56, render: disputeTab, badge: (s) => s.decisions.filter((d) => d.eventId.startsWith('dsp15_')).length || undefined });

// ---------------------------------------------------------------- fandom do ato

function fanTab(s: GameState, id: string): HTMLElement {
  const f = fandomOf(s, id);
  const st = fn15(s);
  const v = vaultSong(s, id);
  const cap = (st.cap[id] ?? 0) > s.week;
  const pr = st.pr[id];
  return h('div', null,
    h('p', null, f.name ? pill(f.name, 'trait') : null, ' ', h('span', { class: 'small muted' }, t(l('Ritual da época: {r}', 'Ritual of the era: {r}'), { r: ritualFor(s) }))),
    h('ul', { class: 'small' },
      h('li', null, t(l('Superfãs: {n} · haters: {h} · toxicidade {x}/100', 'Superfans: {n} · haters: {h} · toxicity {x}/100'), { n: N(f.superfans), h: N(f.haters), x: Math.round(f.toxicity) })),
      h('li', null, t(l('Superfãs organizados fazem pedidos a partir de ~40; toxicidade acima de 25 abre guerra com fandoms rivais do mesmo gênero.', 'Organised superfans start making demands from ~40; toxicity above 25 opens wars with rival fandoms of the same genre.'))),
      v ? h('li', null, t(l('Os fãs sabem de "{t}" (gravada, inédita): pode virar petição.', 'Fans know about "{t}" (recorded, unreleased): it may become a petition.'), { t: v.title })) : null,
      cap ? h('li', null, t(l('Teto de ingresso em vigor até a semana {w} (bilheteria −6%).', 'Ticket cap in force until week {w} (box office −6%).'), { w: st.cap[id] })) : null,
      pr ? h('li', null, t(l('Promessa aos fãs: lançar "{t}" até a semana {w}.', 'Promise to fans: release "{t}" by week {w}.'), { t: s.songs[pr[0]]?.title ?? '?', w: pr[1] + 52 })) : null),
    pending(s, 'fan15_', id),
    section(t(l('O fandom (todos os seus atos)', 'Fandom (all your acts)')), logList(st.log)));
}
registerPageTab('act', { id: 'fan15', label: l('Fandom', 'Fandom'), icon: 'fans', order: 58, when: (s, id) => s.acts[id]?.owner === 'player', render: fanTab });

// ---------------------------------------------------------------- júri e esnobadas

registerSection('charts', { id: 'aw15', order: 80, render: (s) => {
  const st = aw15(s);
  return section(t(l('Prêmios nacionais: júri e esnobadas', 'National awards: jury and snubs')),
    h('p', { class: 'small muted' }, t(l('Cada país vota com júri local: artista da casa pesa 2,5×, a qualidade dos discos conta e há uma margem de lobby. Vender mais não garante o troféu.', 'Each country votes with a local jury: home acts weigh 2.5×, record quality counts and there is a lobbying margin. Selling the most does not guarantee the trophy.'))),
    pending(s, 'aw15_'),
    st.snubs.length ? h('ul', { class: 'small' }, st.snubs.map(([y, a, c, w]) => h('li', null, `${y} · ${t(countryName(c))}: `, actLink(s, a), ` ${t(l('perdeu para', 'lost to'))} ${w}`))) : null);
} });
