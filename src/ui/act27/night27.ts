// r27 (AUD1) — NOITE DE OLHEIRO (interface). O mapa da cidade à noite: casas com quem toca, gente na porta, o
// comentário do balcão e o olheiro rival. Três horários; em cada um você escolhe a quem prestar atenção (e se puxa
// conversa depois). No fim, cada escolha vira uma linha com o porquê. O motor fica em src/sim/sys/night27.ts; o
// modo Rápido continua sendo "Mandar olheiro a uma cena" (a tela Talentos).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { COLS23 } from '../../sim/sys/scout23';
import { SLOTS27, VENUE_K27, actGenre27, actName27, actSize27, nightBlock27, nightCost27, nightPlan27, playNight27, type NightPick27, type NightPlan27, type NightVenue27 } from '../../sim/sys/night27';
import { cityName, $, modal, rerender, toast } from '../common';
import { h } from '../dom';
import { store } from '../store';
import { cutscene27 } from './mode27';
import './night27.css';

const T = (x: L) => t(x);
const pips = (n: number, max = 3) => h('span', { class: 'n27m-pips', 'aria-hidden': 'true' }, ...Array.from({ length: max }, (_, i) => h('i', { class: i < n ? 'on' : '' })));
const BUZZ: L[] = [l('vazio', 'empty'), l('meia casa', 'half full'), l('cheio', 'packed')];
const DEG: L[] = [l('nome novo', 'new name'), COLS23.rumor.name, COLS23.observed.name, COLS23.followed.name, COLS23.audition.name];

/** Abre a noite de olheiro (modo Jogável). */
export function openNight27(): void {
  const s = store.game;
  if (!s) return;
  const block = nightBlock27(s);
  if (block) { toast(t(block), 'bad'); return; }
  const plan: NightPlan27 = nightPlan27(s);
  if (!plan.venues.length) { toast(t(l('Nenhum show na cidade esta noite.', 'No shows in town tonight.')), 'info'); return; }
  const picks: NightPick27[] = [];
  let sel: string = plan.venues[0].id;
  let talk = false;
  let close = () => {};
  const root = h('div', { class: 'n27m' });

  const venueBtn = (v: NightVenue27) => {
    const buzz = Math.max(...v.acts.map((a) => a.buzz));
    const chosen = picks.some((p) => p.venue === v.id);
    return h('button', {
      class: `n27m-venue k-${v.kind}${sel === v.id ? ' sel' : ''}${chosen ? ' been' : ''}`, style: `--x:${v.x}%;--y:${v.y}%`,
      'aria-pressed': sel === v.id ? 'true' : 'false',
      'aria-label': `${T(v.name)} — ${T(VENUE_K27[v.kind].name)}, ${T(BUZZ[buzz - 1])}${v.rival ? `, ${t(l('rival no bar', 'rival at the bar'))}` : ''}`,
      onclick: () => { sel = v.id; draw(); },
    },
      h('span', { class: 'n27m-roof' }), h('span', { class: 'n27m-front' }, h('span', { class: 'n27m-door' })),
      h('b', null, T(v.name)), h('small', null, `${T(VENUE_K27[v.kind].name)} · ${v.fee ? $(v.fee) : t(l('grátis', 'free'))}`), pips(buzz),
      v.rival ? h('span', { class: 'n27m-rival', title: t(l('Olheiro de selo rival no bar', 'A rival label scout at the bar')) }, '!') : null);
  };

  const draw = () => {
    const slot = picks.length;
    const v = plan.venues.find((x) => x.id === sel)!;
    const done = slot >= SLOTS27.length;
    const cost = nightCost27(s, plan, picks);
    const timeline = h('ol', { class: 'n27m-slots', 'aria-label': t(l('Horários da noite', 'Night slots')) }, ...SLOTS27.map((x, i) => {
      const p = picks[i];
      const na = p ? plan.venues.find((v) => v.id === p.venue)?.acts.find((y) => y.actId === p.act) : undefined;
      return h('li', { class: i === slot ? 'now' : p ? 'done' : '' }, h('small', null, T(x)), h('b', null, na ? `${T(actName27(s, na))}${p!.talk ? ' 💬' : ''}` : i === slot ? t(l('agora', 'now')) : '—'));
    }));
    const map = h('div', { class: 'n27m-map', role: 'group', 'aria-label': t(l('Mapa da cidade à noite', 'Night city map')) }, ...plan.venues.map(venueBtn));
    const acts = h('div', { class: 'n27m-acts' },
      h('h4', null, T(v.name), v.rival ? h('span', { class: 'n27m-warn' }, ' · ', fmt(l('olheiro da {l} no bar', '{l} scout at the bar'), { l: v.rival.name })) : null),
      ...v.acts.map((x) => {
        const prevSame = picks[slot - 1]?.act === x.actId && picks[slot - 1]?.venue === v.id;
        return h('article', { class: 'n27m-act' },
          h('div', null, h('b', null, T(actName27(s, x))), h('small', { class: 'muted' }, ` · ${T(actGenre27(s, x))} · ${actSize27(s, x)}👤`)),
          h('div', { class: 'small' }, pips(x.buzz), ' ', T(BUZZ[x.buzz - 1]), ' · ', x.signedTo ? h('span', { class: 'muted' }, t(l('contratado', 'signed'))) : h('span', { class: x.known ? 'good' : 'muted' }, T(DEG[Math.min(4, x.known)]))),
          h('p', { class: 'n27m-tip' }, T(x.tip)),
          x.signedTo ? h('p', { class: 'small muted' }, fmt(l('Contrato com {l}: dá para ver, não para assinar.', 'Signed to {l}: you can watch, not sign.'), { l: x.signedTo })) : null,
          done ? null : h('button', { class: `btn small${x.signedTo ? ' ghost' : ' primary'}`, onclick: () => { picks.push({ venue: v.id, act: x.actId, talk }); talk = false; draw(); } },
            x.signedTo ? fmt(l('Só assistir às {s}', 'Just watch at {s}'), { s: T(SLOTS27[slot]) }) : prevSame ? fmt(l('Ficar o show inteiro ({s})', 'Stay for the whole set ({s})'), { s: T(SLOTS27[slot]) }) : fmt(l('Ver às {s}', 'Watch at {s}'), { s: T(SLOTS27[slot]) })));
      }));
    const ctl = h('div', { class: 'n27m-ctl' },
      done ? null : h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: talk, onchange: (e: Event) => { talk = (e.target as HTMLInputElement).checked; } }), ' ', t(l('Puxar conversa depois do show (carisma; +bebida)', 'Chat after the show (charisma; +a drink)'))),
      h('span', { class: 'small' }, t(l('Custo da noite', 'Night cost')), ': ', h('b', null, $(cost)), ' · 1●'),
      picks.length ? h('button', { class: 'btn small ghost', onclick: () => { picks.pop(); draw(); } }, t(l('Desfazer', 'Undo'))) : null,
      h('button', { class: `btn small${done ? ' primary' : ''}`, disabled: !picks.length, onclick: () => finish() }, done ? t(l('Voltar para casa', 'Head home')) : t(l('Ir para casa mais cedo', 'Head home early'))));
    root.replaceChildren(
      h('p', { class: 'small muted' }, t(l('Escolha uma casa no mapa e a quem prestar atenção em cada horário. A porta diz quanta gente veio (fama); o balcão dá um palpite sobre o potencial — acerta mais do que erra. Ficar o show inteiro ou conversar depois mostra mais.', 'Pick a venue on the map and whom to watch in each slot. The door tells you how many came (fame); the bar gives a hunch about potential — right more often than not. Staying for the whole set or chatting afterwards shows more.'))),
      timeline, h('div', { class: 'n27m-cols' }, map, acts), ctl);
  };

  const finish = () => {
    const res = playNight27(s, plan, picks);
    if ('pt' in res) { toast(t(res), 'bad'); return; }
    cutscene27('night27', { city: plan.city, n: res.newNames });
    root.replaceChildren(
      h('h4', null, fmt(l('A noite rendeu {n} nome(s) novo(s) e {d} relatório(s) mais fundo(s). Gasto: {c}.', 'The night brought {n} new name(s) and {d} deeper report(s). Spent: {c}.'), { n: res.newNames, d: res.deeper, c: $(res.cost) })),
      h('ol', { class: 'n27m-res', 'aria-live': 'polite' }, ...res.lines.map((x) => h('li', { class: x.tone },
        h('small', null, T(SLOTS27[x.slot])), ' ', h('b', null, s.acts[x.actId]?.name ?? '?'), ' ', x.after > x.before ? h('span', { class: 'muted small' }, `${T(DEG[Math.min(4, x.before)])} → ${T(DEG[Math.min(4, x.after)])}`) : null,
        h('p', null, T(x.why))))),
      h('p', { class: 'small muted' }, t(l('Os nomes estão no Funil (Talentos) com a origem "noite de olheiro".', 'The names are in the Funnel (Talents) with origin "scouting night".'))),
      h('button', { class: 'btn primary', onclick: () => close() }, t(l('Fechar', 'Close'))));
    (root.querySelector('.btn.primary') as HTMLElement | null)?.focus();
  };

  draw();
  close = modal(fmt(l('Noite de olheiro — {c}', 'Scouting night — {c}'), { c: cityName(plan.city) }), root, { wide: true, onClose: () => rerender() });
}

const fmt = (x: L, p: Record<string, string | number>) => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
